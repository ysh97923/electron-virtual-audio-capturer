<script lang="ts" setup>
import { h } from "vue"
import { useTheme } from "@/hooks/useTheme"
import { APP_TITLE } from "@/hooks/useTitle"
import { ElNotification } from "element-plus"
// 将 Element Plus 的语言设置为中文
import zhCn from "element-plus/es/locale/lang/zh-cn"

window.__electronLog && window.__electronLog.log(`Hello, ${APP_TITLE}! `)

const { initTheme } = useTheme()

/** 初始化主题 */
initTheme()

/** 作者小心思 */
// ElNotification({
//   title: "Hello",
//   type: "success",
//   message: h(
//     "a",
//     { style: "color: teal", target: "_blank", href: "https://github.com/un-pany/v3-admin-vite" },
//     "小项目获取 star 不易，如果你喜欢这个项目的话，欢迎点击这里支持一个 star ！这是作者持续维护的唯一动力（小声：毕竟是免费的）"
//   ),
//   duration: 0,
//   position: "bottom-right"
// })
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>
