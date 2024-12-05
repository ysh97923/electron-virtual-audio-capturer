const { ipcMain } = require("electron")
import FFmpegRecord from "./FFmpegRecord"
export default class AudioRecorder {
  static outputStream: any
  /**
   * 初始化录音模块
   */
  static init() {
    ipcMain.handle("start-audio-recording", async (event) => {
      if (FFmpegRecord.recording) return event.sender.send("start-audio-recording", { success: false, err: '录音中' })
      FFmpegRecord.startRecording(res => {
        event.sender.send("start-audio-recording", res)
      })
    })
    ipcMain.handle("stop-audio-recording", async (event) => {
      FFmpegRecord.stopRecording()
      event.sender.send("stop-audio-recording")
    })
  }
}
