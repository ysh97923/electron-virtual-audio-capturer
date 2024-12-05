const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const INPUT_DEVICE = 'virtual-audio-capturer'; // 使用的虚拟声卡

const projectRoot = path.join(__dirname, '/');// 获取项目根目录
const ffmpegPath = path.join(projectRoot, 'resources/ffmpeg', 'ffmpeg.exe');// 设置 FFmpeg 的路径
const chunkDuration = 1; // 每个录音片段的时长（秒）
let ffmpegProcess = null; // FFmpeg 子进程
let recording = false; // 录音状态
const watchedFiles = new Set(); // 监听目录中文件的生成
const outputAudiosPath = path.join(__dirname, 'audios');// 录音文件存储根目录
// 开始录音方法
function startRecording(onDataCallback) {
    if (recording) {
        console.error('录音已在进行中');
        return;
    }
    recording = true;
    const outputFilePathTemplate = path.join(outputAudiosPath, 'output_chunk_%03d.wav'); // 分片文件路径模板

    // 如果没有输出目录，则创建一个
    if (!fs.existsSync(outputAudiosPath)) {
        fs.mkdirSync(outputAudiosPath);
    }
    // 清除outputFilePathTemplate 下的所有wav
    fs.readdirSync(outputAudiosPath).forEach(file => {
        if (file.endsWith('.wav')) {
            const filePath = path.join(outputAudiosPath, file);
            fs.unlinkSync(filePath);
        }
    });



    const ffmpegCmd = [
        '-f', 'dshow',
        '-i', `audio=${INPUT_DEVICE}`,
        '-f', 'segment', // 使用分片功能
        '-segment_time', chunkDuration.toString(),
        '-reset_timestamps', '1',
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        outputFilePathTemplate
    ];

    // 优化启动ffmpegProcess的错误处理
    ffmpegProcess = spawn(ffmpegPath, ffmpegCmd);
    ffmpegProcess.on('error', (err) => {
        console.error(`启动FFmpeg进程失败: ${err.message}`);
        recording = false;
    });

    ffmpegProcess.stderr.on('data', (data) => {
        const message = data.toString();
        // 检查特定的关键字
        if (message.toLowerCase().includes('error')) {
            console.error(`FFmpeg 错误输出: ${message}`);
        } else {
            console.log(`FFmpeg 日志: ${message}`);
        }
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg 进程退出，退出码: ${code}`);
        recording = false;
    });

    // 使用fs.watch监听目录
    fs.watch(outputAudiosPath, { recursive: true }, (eventType, filename) => {
        if (eventType === 'change' && filename && filename.startsWith('output_chunk_') && filename.endsWith('.wav')) {
            const filePath = path.join(outputAudiosPath, filename);
            if (!watchedFiles.has(filePath)) {
                watchedFiles.add(filePath);
                let stabilityCheckCount = 0;
                const stabilityCheckInterval = 100; // 每次检查间隔100毫秒
                const maxStabilityChecks = 100; // 最多检查100次

                const checkFileStability = () => {
                    stabilityCheckCount++;
                    fs.stat(filePath, (err, stats) => {
                        if (err) {
                            console.error(`获取文件状态错误: ${err.message}`);
                            return;
                        }

                        if (stats.size > 0 && stats.mtimeMs === stats.ctimeMs) {
                            // 文件大小大于0且修改时间和创建时间相同，说明文件稳定
                            fs.readFile(filePath, (err, data) => {
                                if (err) {
                                    console.error(`读取文件错误: ${err.message}`);
                                    return;
                                }
                                onDataCallback(data);
                            });
                        } else if (stabilityCheckCount < maxStabilityChecks) {
                            // 文件还不稳定，继续检查
                            setTimeout(checkFileStability, stabilityCheckInterval);
                        } else {
                            console.error(`文件在规定时间内未稳定: ${filePath}`);
                            watchedFiles.delete(filePath);
                        }
                    });
                };

                setTimeout(checkFileStability, stabilityCheckInterval);
            }
        }
    });

    console.log('录音已开始');
}

// 停止录音方法
function stopRecording() {
    if (!recording || !ffmpegProcess) {
        console.error('录音未进行中');
        return;
    }
    ffmpegProcess.kill('SIGINT'); // 发送中断信号停止录音
    ffmpegProcess = null;
    recording = false;

    console.log('录音已停止');

}

// 开始录音
startRecording((base64Chunk) => {
    console.log('收到一段 Base64 音频数据: ', base64Chunk);
});
// 停止录音示例（比如在 10 秒后停止）
setTimeout(() => {
    stopRecording();
}, 4000);

module.exports = { startRecording, stopRecording };
