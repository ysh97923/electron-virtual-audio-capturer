<template>
  <div class="app-container">
    <div class="audio-list">
      <div class="audio-item" v-for="(item, index) in messages" :key="index" @click="downFile(index)">
        file{{ index }} - {{ item.length }}
      </div>
    </div>
    <div class="btns">
      <ElButton type="primary" @click="start">开始录音</ElButton>
      <ElButton type="danger" @click="stop">停止录音</ElButton>
      <span> {{ recording ? "录制中..." : "已暂停" }} </span>
    </div>
  </div>
</template>

<script setup>
const { ipcRenderer } = require("electron")
import { ElButton } from "element-plus"
import { ref, onMounted, onUnmounted } from "vue"

const messages = ref([])
const recording = ref(false)
onMounted(() => {
  // 监听主进程发送的 "start-audio-recording" 消息
  ipcRenderer.on("start-audio-recording", (event, uintPatam) => {
    if (!uintPatam.success) {
      stop()
      console.log("录音启动失败：", uintPatam.err)
      // 在这里可以进行相应的UI更新，比如显示一个错误提示框给用户
    } else {
      console.log("录音启动成功：", uintPatam)
      // 进行录音启动成功后的相关UI操作或其他逻辑处理
      messages.value.push(uintPatam.data)
      recording.value = true
    }
  })
  // 监听主进程发送的 "stop-audio-recording" 消息
  ipcRenderer.on("stop-audio-recording", (event, uintPatam) => {
    console.log("成功停止")
    recording.value = false
  })
})
onUnmounted(() => {
  ipcRenderer.removeAllListeners("start-audio-recording")
  ipcRenderer.removeAllListeners("stop-audio-recording")
})
const start = () => {
  ipcRenderer.invoke("start-audio-recording")
}
const stop = () => {
  ipcRenderer.invoke("stop-audio-recording")
}
const downFile = (index) => {
  console.log("uint8Array", messages.value[index])
}
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;

  .audio-list {
    overflow: auto;
    height: 80%;
    .audio-item {
      cursor: pointer;
    }
  }

  .btns {
    height: 20%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>
