const { exec } = require('child_process');
const path = require('path');

// 获取项目根目录
const projectRoot = path.join(__dirname, '/'); // 根据你的项目结构可能需要调整

// 设置 FFmpeg 的路径
const ffmpegPath = path.join(projectRoot, 'resources/ffmpeg', 'ffmpeg.exe');

// 设置录制参数
const outputFilePath = path.join(__dirname, 'output.wav'); // 输出文件路径
const duration = '10'; // 录制时间，单位秒
const inputDevice = 'virtual-audio-capturer'; // 替换为你的系统音频输入设备名称

// FFmpeg 命令
// 注意：这里使用项目内部的 ffmpeg.exe
const ffmpegCmd = `"${ffmpegPath}" -f dshow -i audio="${inputDevice}" -t ${duration} -acodec pcm_s16le -ar 44100 -ac 2 "${outputFilePath}"`;

// 执行 FFmpeg 命令
exec(ffmpegCmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`FFmpeg 错误输出: ${stderr}`);
    return;
  }
  console.log(`录制完成，文件已保存到 ${outputFilePath}`);
});
