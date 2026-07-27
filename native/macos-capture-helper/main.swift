import Foundation
import AVFoundation
import CoreMedia
import ScreenCaptureKit
import CoreGraphics

struct Command: Decodable {
    let id: String
    let command: String
    let sessionId: String?
    let sessionDirectory: String?
    let sourceKinds: [String]?
    let microphoneId: String?
    let sourceKind: String?
}

struct Segment: Codable {
    let sourceKind: String
    let path: String
    let activeStartMs: Int
    let durationMs: Int
}

struct Manifest: Codable {
    let version: Int
    let sessionId: String
    let startedAt: String
    let stoppedAt: String
    let activeDurationMs: Int
    let sourceKinds: [String]
    let segments: [Segment]
    let finalized: Bool
}

final class CaptureSession: NSObject, SCStreamOutput, SCStreamDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    private let outputQueue = DispatchQueue(label: "com.audistill.capture.audio")
    private var stream: SCStream?
    private var previewStream: SCStream?
    private var microphoneSession: AVCaptureSession?
    private var microphoneFile: AVAudioFile?
    private var systemFile: AVAudioFile?
    private var sessionId = ""
    private var sessionDirectory = URL(fileURLWithPath: "/")
    private var startedAt = Date()
    private var segmentStartedAtMs = 0
    private var systemFrames: AVAudioFramePosition = 0
    private var microphoneFrames: AVAudioFramePosition = 0
    private var segmentWallStartedAt = Date()
    private var systemOffsetMs: Int?
    private var microphoneOffsetMs: Int?
    private let sampleRate = 48_000.0
    private var segmentIndex = 0
    private var microphoneFileIndex = 0
    private var segments: [Segment] = []
    private var sourceKinds: [String] = []
    private var selectedMicrophoneId: String?
    private var lastActivityEmission: [String: Date] = [:]
    private var interruptedSourceKinds = Set<String>()
    private var storagePressureReported = false
    private let encoder = JSONEncoder()
    private let isoFormatter = ISO8601DateFormatter()

    func sourceStatus() async -> [[String: Any]] {
        var sources: [[String: Any]] = []
        let screenReady = CGPreflightScreenCaptureAccess()
        if screenReady, sessionId.isEmpty, previewStream == nil {
            do {
                let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
                let preview = try makeAudioStream(content: content)
                previewStream = preview
                try await preview.startCapture()
            } catch { /* readiness is reported below and Start will surface a concrete failure */ }
        }
        let interruptedKinds = outputQueue.sync { interruptedSourceKinds }
        let systemInterrupted = interruptedKinds.contains("system-audio")
        sources.append(source(
            id: "system-audio",
            kind: "system-audio",
            name: "System Audio",
            detail: systemInterrupted ? "System Audio capture was interrupted" : (screenReady ? "Audio playing on this Mac" : "Screen Recording access is required"),
            readiness: systemInterrupted ? "unavailable" : (screenReady ? "ready" : "denied")
        ))

        let microphoneStatus = AVCaptureDevice.authorizationStatus(for: .audio)
        let microphoneReadiness: String
        switch microphoneStatus {
        case .authorized: microphoneReadiness = "ready"
        case .notDetermined: microphoneReadiness = "permission-not-determined"
        case .denied, .restricted: microphoneReadiness = "denied"
        @unknown default: microphoneReadiness = "unavailable"
        }
        let microphones = availableMicrophones()
        if selectedMicrophoneId == nil { selectedMicrophoneId = microphones.first?.uniqueID }
        if microphoneReadiness == "ready", sessionId.isEmpty, microphoneSession == nil, let microphoneId = selectedMicrophoneId {
            try? startMicrophone(deviceId: microphoneId)
        }
        if microphones.isEmpty {
            sources.append(source(id: "microphone-unavailable", kind: "microphone", name: "Microphone", detail: "No Microphone Source is connected", readiness: "unavailable"))
        } else {
            for microphone in microphones {
                let microphoneInterrupted = interruptedKinds.contains("microphone") && microphone.uniqueID == selectedMicrophoneId
                let detail = microphoneInterrupted ? "Microphone capture was interrupted" : (microphoneReadiness == "ready" ? "Microphone input" : "Microphone access is required")
                sources.append(source(id: microphone.uniqueID, kind: "microphone", name: microphone.localizedName, detail: detail, readiness: microphoneInterrupted ? "unavailable" : microphoneReadiness))
            }
        }
        return sources
    }

    func requestPermission(kind: String) async throws -> Bool {
        switch kind {
        case "system-audio":
            return CGRequestScreenCaptureAccess()
        case "microphone":
            return await microphoneAccessGranted(requestIfNeeded: true)
        default:
            throw HelperError.message("Unsupported permission request")
        }
    }

    func selectMicrophone(id: String) async throws {
        guard sessionId.isEmpty else { throw HelperError.message("Microphone selection is locked during capture") }
        guard availableMicrophones().contains(where: { $0.uniqueID == id }) else {
            throw HelperError.message("Selected Microphone Source is unavailable")
        }
        stopMicrophone()
        selectedMicrophoneId = id
        try startMicrophone(deviceId: id)
    }

    func replaceMicrophone(id: String) async throws {
        guard sourceKinds.contains("microphone") else { throw HelperError.message("Microphone is not enabled") }
        guard availableMicrophones().contains(where: { $0.uniqueID == id }) else { throw HelperError.message("Selected Microphone Source is unavailable") }
        let wasCapturing = !sessionId.isEmpty && (stream != nil || microphoneSession != nil)
        stopMicrophone()
        var finalizedFrames: AVAudioFramePosition = 0
        outputQueue.sync {
            microphoneFile = nil
            finalizedFrames = microphoneFrames
        }
        if finalizedFrames > 0 {
            let durationMs = Int((Double(finalizedFrames) / sampleRate * 1000.0).rounded())
            segments.append(Segment(
                sourceKind: "microphone",
                path: segmentFilename(kind: "microphone", index: microphoneFileIndex),
                activeStartMs: segmentStartedAtMs + (microphoneOffsetMs ?? 0),
                durationMs: durationMs
            ))
            microphoneFileIndex += 1
        }
        selectedMicrophoneId = id
        _ = outputQueue.sync { interruptedSourceKinds.remove("microphone") }
        microphoneFrames = 0
        microphoneOffsetMs = max(0, Int(Date().timeIntervalSince(segmentWallStartedAt) * 1_000))
        if wasCapturing { try startMicrophone(deviceId: id) }
    }

    func start(sessionId: String, sessionDirectory: String, sourceKinds: [String], microphoneId: String?) async throws {
        guard stream == nil, self.sessionId.isEmpty else { throw HelperError.message("Capture is already active") }
        guard !sourceKinds.isEmpty, sourceKinds.allSatisfy({ $0 == "system-audio" || $0 == "microphone" }) else {
            throw HelperError.message("At least one supported source is required")
        }
        if let previewStream {
            try await previewStream.stopCapture()
            self.previewStream = nil
        }
        stopMicrophone()
        self.sessionId = sessionId
        self.sessionDirectory = URL(fileURLWithPath: sessionDirectory, isDirectory: true)
        self.startedAt = Date()
        self.segmentStartedAtMs = 0
        self.systemFrames = 0
        self.microphoneFrames = 0
        self.segmentIndex = 0
        self.microphoneFileIndex = 0
        self.segments = []
        self.sourceKinds = sourceKinds
        self.selectedMicrophoneId = microphoneId
        outputQueue.sync {
            interruptedSourceKinds.removeAll()
            storagePressureReported = false
        }
        try FileManager.default.createDirectory(at: self.sessionDirectory, withIntermediateDirectories: true)
        do {
            try await startSegment()
        } catch {
            if let stream { try? await stream.stopCapture() }
            stream = nil
            stopMicrophone()
            self.sessionId = ""
            self.sourceKinds = []
            try? FileManager.default.removeItem(at: self.sessionDirectory)
            throw error
        }
    }

    func pause() async throws {
        guard !sessionId.isEmpty, stream != nil || microphoneSession != nil else { throw HelperError.message("Capture is not active") }
        try await closeSegment()
    }

    func resume() async throws {
        guard stream == nil, microphoneSession == nil, !sessionId.isEmpty else { throw HelperError.message("Capture is not paused") }
        try await startSegment()
    }

    func stop() async throws -> String {
        if stream != nil || microphoneSession != nil { try await closeSegment() }
        guard !sessionId.isEmpty else { throw HelperError.message("No capture is active") }
        let stoppedAt = Date()
        let activeDurationMs = segments.map { $0.activeStartMs + $0.durationMs }.max() ?? 0
        let manifest = Manifest(
            version: 1,
            sessionId: sessionId,
            startedAt: isoFormatter.string(from: startedAt),
            stoppedAt: isoFormatter.string(from: stoppedAt),
            activeDurationMs: activeDurationMs,
            sourceKinds: sourceKinds,
            segments: segments,
            finalized: true
        )
        let path = try writeManifest(manifest)
        sessionId = ""
        outputQueue.sync { interruptedSourceKinds.removeAll() }
        return path.path
    }

    func cancel() async {
        if let stream {
            try? await stream.stopCapture()
        }
        if let previewStream {
            try? await previewStream.stopCapture()
        }
        stream = nil
        previewStream = nil
        stopMicrophone()
        outputQueue.sync {
            systemFile = nil
            microphoneFile = nil
        }
        if !sessionId.isEmpty { try? FileManager.default.removeItem(at: sessionDirectory) }
        sessionId = ""
        sourceKinds = []
        outputQueue.sync { interruptedSourceKinds.removeAll() }
    }

    private func startSegment() async throws {
        systemFrames = 0
        microphoneFrames = 0
        systemOffsetMs = nil
        microphoneOffsetMs = nil
        segmentWallStartedAt = Date()
        if sourceKinds.contains("system-audio") {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
            let nextStream = try makeAudioStream(content: content)
            stream = nextStream
            try await nextStream.startCapture()
        }
        if sourceKinds.contains("microphone") {
            guard let microphoneId = selectedMicrophoneId else { throw HelperError.message("Select a Microphone Source") }
            try startMicrophone(deviceId: microphoneId)
        }
    }

    private func makeAudioStream(content: SCShareableContent) throws -> SCStream {
        guard let display = content.displays.first else { throw HelperError.message("No display is available for System Audio capture") }
        let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
        let configuration = SCStreamConfiguration()
        configuration.capturesAudio = true
        configuration.excludesCurrentProcessAudio = true
        configuration.sampleRate = Int(sampleRate)
        configuration.channelCount = 1
        configuration.width = 2
        configuration.height = 2
        configuration.minimumFrameInterval = CMTime(value: 1, timescale: 1)
        let audioStream = SCStream(filter: filter, configuration: configuration, delegate: self)
        try audioStream.addStreamOutput(self, type: .audio, sampleHandlerQueue: outputQueue)
        return audioStream
    }

    private func closeSegment() async throws {
        if let currentStream = stream { try? await currentStream.stopCapture() }
        stream = nil
        stopMicrophone()
        var finalizedSystemFrames: AVAudioFramePosition = 0
        var finalizedMicrophoneFrames: AVAudioFramePosition = 0
        outputQueue.sync {
            systemFile = nil
            microphoneFile = nil
            finalizedSystemFrames = systemFrames
            finalizedMicrophoneFrames = microphoneFrames
        }
        let systemDurationMs = Int((Double(finalizedSystemFrames) / sampleRate * 1000.0).rounded())
        let microphoneDurationMs = Int((Double(finalizedMicrophoneFrames) / sampleRate * 1000.0).rounded())
        let finalizedSystemOffsetMs = systemOffsetMs ?? 0
        let finalizedMicrophoneOffsetMs = microphoneOffsetMs ?? 0
        if systemDurationMs > 0 {
            segments.append(Segment(sourceKind: "system-audio", path: segmentFilename(kind: "system", index: segmentIndex), activeStartMs: segmentStartedAtMs + finalizedSystemOffsetMs, durationMs: systemDurationMs))
        }
        if microphoneDurationMs > 0 {
            segments.append(Segment(sourceKind: "microphone", path: segmentFilename(kind: "microphone", index: microphoneFileIndex), activeStartMs: segmentStartedAtMs + finalizedMicrophoneOffsetMs, durationMs: microphoneDurationMs))
            microphoneFileIndex += 1
        }
        let segmentDurationMs = max(finalizedSystemOffsetMs + systemDurationMs, finalizedMicrophoneOffsetMs + microphoneDurationMs)
        if segmentDurationMs > 0 {
            segmentStartedAtMs += segmentDurationMs
            segmentIndex += 1
            let partial = Manifest(
                version: 1,
                sessionId: sessionId,
                startedAt: isoFormatter.string(from: startedAt),
                stoppedAt: isoFormatter.string(from: Date()),
                activeDurationMs: segmentStartedAtMs,
                sourceKinds: sourceKinds,
                segments: segments,
                finalized: false
            )
            _ = try writeManifest(partial)
        }
        systemFrames = 0
        microphoneFrames = 0
        systemOffsetMs = nil
        microphoneOffsetMs = nil
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        outputQueue.async { self.interruptedSourceKinds.insert("system-audio") }
        emit(["type": "capture-error", "sourceKind": "system-audio", "message": error.localizedDescription])
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType) {
        if outputType == .audio { process(sampleBuffer: sampleBuffer, sourceKind: "system-audio", sourceId: "system-audio") }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let microphoneId = selectedMicrophoneId else { return }
        process(sampleBuffer: sampleBuffer, sourceKind: "microphone", sourceId: microphoneId)
    }

    private func process(sampleBuffer: CMSampleBuffer, sourceKind: String, sourceId: String) {
        guard sampleBuffer.isValid,
              CMSampleBufferDataIsReady(sampleBuffer),
              let formatDescription = CMSampleBufferGetFormatDescription(sampleBuffer),
              let description = CMAudioFormatDescriptionGetStreamBasicDescription(formatDescription),
              let format = AVAudioFormat(streamDescription: description) else { return }
        do {
            try withPCMBuffer(sampleBuffer: sampleBuffer, format: format) { buffer in
                if !sessionId.isEmpty {
                    let fileIndex = sourceKind == "microphone" ? microphoneFileIndex : segmentIndex
                    let fileURL = sessionDirectory.appendingPathComponent(segmentFilename(kind: sourceKind == "microphone" ? "microphone" : "system", index: fileIndex))
                    if sourceKind == "microphone" {
                        if microphoneOffsetMs == nil { microphoneOffsetMs = max(0, Int(Date().timeIntervalSince(segmentWallStartedAt) * 1_000)) }
                        if microphoneFile == nil { microphoneFile = try AVAudioFile(forWriting: fileURL, settings: format.settings, commonFormat: format.commonFormat, interleaved: format.isInterleaved) }
                        try microphoneFile?.write(from: buffer)
                        microphoneFrames += AVAudioFramePosition(buffer.frameLength)
                    } else {
                        if systemOffsetMs == nil { systemOffsetMs = max(0, Int(Date().timeIntervalSince(segmentWallStartedAt) * 1_000)) }
                        if systemFile == nil { systemFile = try AVAudioFile(forWriting: fileURL, settings: format.settings, commonFormat: format.commonFormat, interleaved: format.isInterleaved) }
                        try systemFile?.write(from: buffer)
                        systemFrames += AVAudioFramePosition(buffer.frameLength)
                    }
                }
                let now = Date()
                if now.timeIntervalSince(lastActivityEmission[sourceId] ?? .distantPast) >= 0.1 {
                    lastActivityEmission[sourceId] = now
                    emit(["type": "activity", "sourceId": sourceId, "sourceKind": sourceKind, "level": rmsLevel(buffer)])
                }
            }
        } catch {
            interruptedSourceKinds.insert(sourceKind)
            if isStorageExhaustion(error) {
                if !storagePressureReported {
                    storagePressureReported = true
                    emit(["type": "storage-error", "message": "Temporary storage is full"])
                }
            } else {
                emit(["type": "capture-error", "sourceKind": sourceKind, "message": error.localizedDescription])
            }
        }
    }

    private func isStorageExhaustion(_ error: Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == NSCocoaErrorDomain && nsError.code == CocoaError.fileWriteOutOfSpace.rawValue { return true }
        if nsError.domain == NSPOSIXErrorDomain && nsError.code == ENOSPC { return true }
        if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? Error { return isStorageExhaustion(underlying) }
        return false
    }

    private func segmentFilename(kind: String, index: Int) -> String {
        String(format: "%@-%04d.caf", kind, index)
    }

    private func source(id: String, kind: String, name: String, detail: String, readiness: String) -> [String: Any] {
        ["id": id, "kind": kind, "name": name, "detail": detail, "readiness": readiness, "activity": 0.0]
    }

    private func availableMicrophones() -> [AVCaptureDevice] {
        AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInMicrophone, .externalUnknown],
            mediaType: .audio,
            position: .unspecified
        ).devices
    }

    private func startMicrophone(deviceId: String) throws {
        guard let device = availableMicrophones().first(where: { $0.uniqueID == deviceId }) else {
            throw HelperError.message("Selected Microphone Source is unavailable")
        }
        let session = AVCaptureSession()
        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else { throw HelperError.message("Could not use the selected Microphone Source") }
        session.addInput(input)
        let output = AVCaptureAudioDataOutput()
        output.audioSettings = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: sampleRate,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsNonInterleaved: false,
        ]
        output.setSampleBufferDelegate(self, queue: outputQueue)
        guard session.canAddOutput(output) else { throw HelperError.message("Could not capture the selected Microphone Source") }
        session.addOutput(output)
        microphoneSession = session
        session.startRunning()
    }

    private func stopMicrophone() {
        microphoneSession?.stopRunning()
        microphoneSession = nil
        outputQueue.sync {}
    }

    private func microphoneAccessGranted(requestIfNeeded: Bool) async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return true
        case .notDetermined where requestIfNeeded:
            return await withCheckedContinuation { continuation in
                AVCaptureDevice.requestAccess(for: .audio) { granted in continuation.resume(returning: granted) }
            }
        default: return false
        }
    }

    private func writeManifest(_ manifest: Manifest) throws -> URL {
        let finalURL = sessionDirectory.appendingPathComponent("manifest.json")
        let data = try encoder.encode(manifest)
        try data.write(to: finalURL, options: .atomic)
        return finalURL
    }
}

func withPCMBuffer(sampleBuffer: CMSampleBuffer, format: AVAudioFormat, body: (AVAudioPCMBuffer) throws -> Void) throws {
    var requiredSize = 0
    var blockBuffer: CMBlockBuffer?
    CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
        sampleBuffer,
        bufferListSizeNeededOut: &requiredSize,
        bufferListOut: nil,
        bufferListSize: 0,
        blockBufferAllocator: nil,
        blockBufferMemoryAllocator: nil,
        flags: 0,
        blockBufferOut: &blockBuffer
    )
    let memory = UnsafeMutableRawPointer.allocate(byteCount: requiredSize, alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { memory.deallocate() }
    let audioBufferList = memory.bindMemory(to: AudioBufferList.self, capacity: 1)
    let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
        sampleBuffer,
        bufferListSizeNeededOut: nil,
        bufferListOut: audioBufferList,
        bufferListSize: requiredSize,
        blockBufferAllocator: nil,
        blockBufferMemoryAllocator: nil,
        flags: UInt32(kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment),
        blockBufferOut: &blockBuffer
    )
    guard status == noErr,
          let pcmBuffer = AVAudioPCMBuffer(pcmFormat: format, bufferListNoCopy: audioBufferList, deallocator: nil) else {
        throw HelperError.message("Could not read captured audio")
    }
    pcmBuffer.frameLength = AVAudioFrameCount(CMSampleBufferGetNumSamples(sampleBuffer))
    try body(pcmBuffer)
}

func rmsLevel(_ buffer: AVAudioPCMBuffer) -> Double {
    guard let channels = buffer.floatChannelData, buffer.frameLength > 0 else { return 0 }
    let count = Int(buffer.frameLength)
    var sum = 0.0
    for index in 0..<count {
        let value = Double(channels[0][index])
        sum += value * value
    }
    return min(1, sqrt(sum / Double(count)) * 4)
}

enum HelperError: Error, LocalizedError {
    case message(String)
    var errorDescription: String? {
        if case let .message(message) = self { return message }
        return "Capture failed"
    }
}

let capture = CaptureSession()
let writeQueue = DispatchQueue(label: "com.audistill.capture.stdout")

func emit(_ value: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(value),
          let data = try? JSONSerialization.data(withJSONObject: value),
          let line = String(data: data, encoding: .utf8) else { return }
    writeQueue.sync {
        FileHandle.standardOutput.write(Data((line + "\n").utf8))
    }
}

func respond(id: String, result: Any? = nil) {
    emit(["type": "response", "id": id, "ok": true, "result": result ?? NSNull()])
}

func fail(id: String, error: Error) {
    emit(["type": "response", "id": id, "ok": false, "error": error.localizedDescription])
}

func handle(_ command: Command) async {
    do {
        switch command.command {
        case "sources":
            respond(id: command.id, result: await capture.sourceStatus())
        case "request-permission":
            guard let sourceKind = command.sourceKind else { throw HelperError.message("Permission request requires a source") }
            let granted = try await capture.requestPermission(kind: sourceKind)
            respond(id: command.id, result: granted)
        case "select-microphone":
            guard let microphoneId = command.microphoneId else { throw HelperError.message("Select Microphone requires a source") }
            try await capture.selectMicrophone(id: microphoneId)
            respond(id: command.id)
        case "replace-microphone":
            guard let microphoneId = command.microphoneId else { throw HelperError.message("Replace Microphone requires a source") }
            try await capture.replaceMicrophone(id: microphoneId)
            respond(id: command.id)
        case "start":
            guard let sessionId = command.sessionId,
                  let directory = command.sessionDirectory,
                  let sourceKinds = command.sourceKinds else {
                throw HelperError.message("Start requires sources and a session directory")
            }
            try await capture.start(sessionId: sessionId, sessionDirectory: directory, sourceKinds: sourceKinds, microphoneId: command.microphoneId)
            respond(id: command.id)
        case "pause":
            try await capture.pause()
            respond(id: command.id)
        case "resume":
            try await capture.resume()
            respond(id: command.id)
        case "stop":
            respond(id: command.id, result: try await capture.stop())
        case "cancel":
            await capture.cancel()
            respond(id: command.id)
        default:
            throw HelperError.message("Unsupported command")
        }
    } catch {
        fail(id: command.id, error: error)
    }
}

while let line = readLine() {
    guard let data = line.data(using: .utf8), let command = try? JSONDecoder().decode(Command.self, from: data) else {
        emit(["type": "protocol-error", "message": "Invalid command"])
        continue
    }
    await handle(command)
}

await capture.cancel()
