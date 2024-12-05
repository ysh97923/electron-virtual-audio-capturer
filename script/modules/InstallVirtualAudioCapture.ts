const { exec } = require("node:child_process")
const path = require("path")
const projectRoot = path.join(__dirname, "..", "..");
const ffmpegPath = path.join(projectRoot, "resources/ffmpeg/ffmpeg.exe") // 设置 FFmpeg 的路径
const audio_sniffer_32 = path.join(projectRoot, "resources/VirtualAudioCaptureDll/win/audio_sniffer-x32.dll") // 设置 声卡32路径
const audio_sniffer_64 = path.join(projectRoot, "resources/VirtualAudioCaptureDll/win/audio_sniffer-x64.dll") // 设置 声卡64路径

// 获取系统音频设备列表
function listAudioDevices(): Promise<any[string]> {
  return new Promise((resolve, reject) => {
    const listDevices = exec(`"${ffmpegPath}" -list_devices true -f dshow -i dummy`)
    let stderr = ""
    listDevices.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    listDevices.on("close", (code) => {
      if (code === 0 || code === 1) {
        // FFmpeg uses exit code 1 for some valid cases
        // 解析设备列表
        const devices: string[] = []
        const lines = stderr.split("\n")
        for (const line of lines) {
          const match = line.match(/\[dshow(.*?)"(.*?)"(.*?)/)
          if (match) {
            devices.push(match[2])
          }
        }
        resolve(devices)
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })
  })
}

/**
 * 安装虚拟声卡
 * @param VIRTUAL_DEVICE_NAME 声卡名称
 * @param isSilent 是否静默安装
 * @returns Promise<undefined>
*/
export default async (VIRTUAL_DEVICE_NAME, isSilent = false) => {
  return listAudioDevices().then((devices: any[]) => {
    if (devices.includes(VIRTUAL_DEVICE_NAME)) return Promise.resolve('已注册')
    if (process.platform === 'win32') {
      exec(`regsvr32 ${isSilent ? '/s' : ''} ${audio_sniffer_64}`) // 注册x64
    } else if (process.arch === 'ia32') {
      exec(`regsvr32 ${isSilent ? '/s' : ''} ${audio_sniffer_32}`) // 注册x32
    }
  })
}
