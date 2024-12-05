const { spawn } = require("node:child_process");
const path = require("path");
const fs = require("fs");
import InstallVirtualAudioCapture from "./InstallVirtualAudioCapture"

class FFmpegRecord {
  VIRTUAL_DEVICE_NAME: string; // 使用的虚拟声卡
  CHUNK_DURATION: number; // 每个录音片段的时长（秒）
  projectRoot: any; // 项目根目录
  ffmpegPath: any; // 设置 FFmpeg 的路径
  outputAudiosPath: any; // 录音文件存储根目录
  watchedFiles: Set<unknown>; // 监听目录中文件的生成
  recording: boolean; // 录音状态
  ffmpegProcess: any; // FFmpeg 进程

  constructor() {
    this.VIRTUAL_DEVICE_NAME = "virtual-audio-capturer"; // 使用的虚拟声卡
    this.CHUNK_DURATION = 1; // 每个录音片段的时长（秒）
    this.projectRoot = path.join(__dirname, "..", "..");
    this.ffmpegPath = path.join(this.projectRoot, "resources/ffmpeg/ffmpeg.exe"); // 设置 FFmpeg 的路径
    this.outputAudiosPath = path.join(this.projectRoot, "audios"); // 录音文件存储根目录
    this.watchedFiles = new Set(); // 监听目录中文件的生成
    this.recording = false; // 录音状态
    this.ffmpegProcess = null;

    InstallVirtualAudioCapture(this.VIRTUAL_DEVICE_NAME, true) // 初始化音频虚拟声卡
  }

  startRecording(onDataCallback) {
    if (this.recording) {
      console.error("Recording is already underway");
      return;
    }
    this.recording = true;
    const outputFilePathTemplate = path.join(this.outputAudiosPath, "output_chunk_%03d.wav"); // 分片文件路径模板

    // 如果没有输出目录，则创建一个
    if (!fs.existsSync(this.outputAudiosPath)) {
      fs.mkdirSync(this.outputAudiosPath);
    }

    // 清除输出目录下的所有wav
    fs.readdirSync(this.outputAudiosPath).forEach((file) => {
      if (file.endsWith(".wav")) {
        const filePath = path.join(this.outputAudiosPath, file);
        fs.unlinkSync(filePath);
      }
    });

    // 执行的命令
    const ffmpegCmd = [
      "-f",
      "dshow",
      "-i",
      `audio=${this.VIRTUAL_DEVICE_NAME}`,
      "-f",
      "segment", // 使用分片功能
      "-segment_time",
      this.CHUNK_DURATION.toString(),
      "-reset_timestamps",
      "1",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "11025",
      "-ac",
      "2",
      outputFilePathTemplate
    ];

    this.ffmpegProcess = spawn(this.ffmpegPath, ffmpegCmd);
    this.ffmpegProcess.on("error", (err) => {
      console.error(`start FFmpeg procedure err: ${err.message}`);
      this.recording = false;
      if (typeof onDataCallback === "function") {
        onDataCallback({ success: false, data: null, err });
      }
    });

    this.ffmpegProcess.stderr.on("data", (data) => {
      const message = data.toString();
      // 检查特定的关键字
      if (message.toLowerCase().includes("error")) {
        console.error(`FFmpeg data error: ${message}`);
      } else {
        console.log(`FFmpeg log: ${message}`);
      }
    });

    this.ffmpegProcess.on("close", (code) => {
      console.log(`FFmpeg close code: ${code}`);
      this.recording = false;
    });

    // 使用fs.watch监听目录
    fs.watch(this.outputAudiosPath, { recursive: true }, (eventType, filename) => {
      if (eventType === "change" && filename && filename.startsWith("output_chunk_") && filename.endsWith(".wav")) {
        const filePath = path.join(this.outputAudiosPath, filename);
        if (!this.watchedFiles.has(filePath)) {
          this.watchedFiles.add(filePath);
          let stabilityCheckCount = 0;
          const stabilityCheckInterval = 100; // 每次检查间隔100毫秒
          const maxStabilityChecks = 10; // 最多检查100次

          const checkFileStability = () => {
            stabilityCheckCount++;
            fs.stat(filePath, (err, stats) => {
              if (err) {
                console.error(`get file err: ${err.message}`);
                if (typeof onDataCallback === "function") {
                  onDataCallback({ success: false, err });
                }
                return;
              }

              if (stats.size > 0 && stats.mtimeMs === stats.ctimeMs) {
                // 文件大小大于0且修改时间和创建时间相同，说明文件稳定
                fs.readFile(filePath, (err, data) => {
                  if (err) {
                    console.error(`read file err: ${err.message}`);
                    return;
                  }
                  if (typeof onDataCallback === "function") {
                    onDataCallback({ success: true, data, err });
                  }

                  // 删除录音文件
                  // fs.unlink(filePath, (err) => {
                  //     if (err) {
                  //         console.error(`delete file err: ${err.message}`);
                  //     }
                  // });
                });
              } else if (stabilityCheckCount < maxStabilityChecks) {
                // 文件还不稳定，继续检查
                setTimeout(checkFileStability, stabilityCheckInterval);
              } else {
                console.error(`file instability: ${filePath}`);
                this.watchedFiles.delete(filePath);
              }
            });
          };

          setTimeout(checkFileStability, stabilityCheckInterval);
        }
      }
    });
  }

  stopRecording() {
    if (!this.recording || !this.ffmpegProcess) {
      console.error("record not start");
      return;
    }
    this.ffmpegProcess.kill("SIGINT"); // 发送中断信号停止录音
    this.ffmpegProcess = null;
    this.recording = false;
    console.log("record stop");
  }
}

export default new FFmpegRecord();
