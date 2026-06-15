const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context

  if (electronPlatformName !== 'darwin') return

  // Skip if a real signing identity is configured
  if (process.env.CSC_LINK || process.env.CSC_NAME) return

  const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`)

  console.log('  • re-signing app bundle with consistent ad-hoc identity...')
  execSync(
    `codesign --deep --force --sign - --entitlements "${path.join(__dirname, '../build/entitlements.mac.plist')}" "${appPath}"`,
    { stdio: 'inherit' }
  )
}
