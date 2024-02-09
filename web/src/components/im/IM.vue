<template>
  <div class="es-im">
    <div class="es-im-container">
      <el-scrollbar class="es-im-user-list">
        <div
          v-for="item in userList"
          :class="['es-im-user-item', { active: chatUser.id === item.id }]"
          @click="handleUserClick(item)"
        >
          <div class="es-im-avatar">
            <div class="es-im-avatar-img" :style="{ background: item.color }">
              {{ item.username.substring(0, 1) }}
            </div>
          </div>
          <div class="es-im-user-content">
            <div class="es-im-title">{{ item.username }}</div>
            <div class="es-im-content">
              <div class="text">{{ item.message.content }}</div>
            </div>
          </div>
          <div class="es-im-user-status">
            {{ dayjs(item.message.createTime).format('HH:mm:ss') }}
          </div>
        </div>
      </el-scrollbar>
      <div class="es-im-chatbox">
        <el-scrollbar ref="infoRef" class="es-im-info">
          <div ref="innerRef" class="es-im-info-list">
            <div
              v-for="item in messageList"
              :class="['es-im-info-item', { active: item.self }]"
            >
              <div v-if="!item.self" class="es-im-avatar">
                <div
                  class="es-im-avatar-img"
                  :style="{ background: chatUser.color }"
                >
                  {{ item.toUserName.substring(0, 1) }}
                </div>
              </div>
              <div class="es-im-message">
                <div class="es-im-title">
                  {{ item.self ? item.fromUserName : item.toUserName }}
                </div>
                <div class="es-im-content">
                  <el-popover
                    placement="bottom"
                    title="Title"
                    :width="200"
                    trigger="click"
                    content="this is content, this is content, this is content"
                  >
                    <template #reference>
                      <div class="is-text" @click.prevent.right="msgMenu(item)">
                        {{ item.content }}
                      </div>
                    </template>
                  </el-popover>

                  <el-text size="small">{{ item.time }}</el-text>
                </div>
              </div>
              <div v-if="item.self" class="es-im-avatar">
                <div class="es-im-avatar-img">
                  {{ item.fromUserName.substring(0, 1) }}
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>
        <div class="es-im-footer">
          <div class="es-im-input">
            <EmojiPicker :native="true" @select="onSelectEmoji" />
            <el-input
              v-model="message"
              type="textarea"
              :rows="5"
              resize="none"
              @keyup.shift.enter="handleSendMessage"
              placeholder="输入内容"
            />
            <div class="es-im-send-btn">
              <el-button type="success" @click="handleSendMessage"
                >发送</el-button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  shallowRef,
  computed,
  onBeforeUnmount,
  nextTick
} from 'vue'
import { useUserStore } from '@/store'
import { io, Socket } from 'socket.io-client'
import { ScrollbarInstance } from 'element-plus'
import dayjs from 'dayjs'

// import picker compopnent
import EmojiPicker from 'vue3-emoji-picker'
import { unicodeToEmoji } from '@/utils/emoji/helpers'

// import css
import 'vue3-emoji-picker/css'

const avatarColors = ['#3a7afe', '#00afef', '#00c48f', '#ff9f00', '#f44336']
const userStore = useUserStore()
const message = ref<string>('')
const list = ref<any[]>([])
const userList = ref<any>([])
const chatUser = ref<any>({})
const socket = shallowRef<Socket | null>(null)
const chatTopic = ref('')
const infoRef = ref<ScrollbarInstance | null>(null)
const innerRef = ref<HTMLElement | null>(null)

const messageList = computed(() => {
  return (list.value || []).map(item => {
    return {
      ...item,
      fromUserName: userStore.username,
      toUserName: chatUser.value.username,
      self: +item.fromUserId === userStore.userid,
      time: dayjs(item.createTime).format('YYYY-MM-DD hh:mm:ss'),
      content: item.content.replace(/##[0-9_a-z]{5}##/gim, word =>
        unicodeToEmoji(word.slice(2, -2))
      )
    }
  })
})

function onSelectEmoji(emoji) {
  console.log(emoji)
  /*
    // result
    {
        i: "😚",
        n: ["kissing face"],
        r: "1f61a", // with skin tone
        t: "neutral", // skin tone
        u: "1f61a" // without tone
    }
    */
}

/**
 * 点击发送
 */
function handleSendMessage() {
  if (!message.value && !message.value.trim()) return
  socket.value?.emit('chat', {
    fromUserId: userStore.userid,
    toUserId: chatUser.value.id,
    content: message.value
  })
  message.value = ''
}
/**
 * 点击聊天列表
 * @param item
 */
function handleUserClick(item) {
  chatUser.value = item
  getChatList()
}

/**
 * 获取左侧列表
 */
async function getUserList() {
  socket.value?.emit('userList', { userId: userStore.userid }, data => {
    userList.value = data.map(item => ({
      ...item,
      color: avatarColors[Math.floor(Math.random() * avatarColors.length)]
    }))
    // 默认与列表的第一位朋友聊天
    chatUser.value = userList.value[0]
    getChatList()
  })
}

// 接收发送的消息
function onChatMessage(data) {
  list.value.push(data)
  setScroll()
}

/**
 * 获取和当前朋友的聊天记录
 */
function getChatList() {
  if (socket.value) {
    socket.value.emit(
      'chatList',
      {
        fromUserId: userStore.userid,
        toUserId: chatUser.value.id
      },
      data => {
        list.value = data || []
        setScroll()
      }
    )

    // 使用聊天双方的id建立事件名称，需要和后端一致
    const ids = [userStore.userid, chatUser.value.id]
    ids.sort((a, b) => a - b)
    const topic = `${ids[0]}-chat-${ids[1]}`

    // 取消前一次的监听
    socket.value.off(chatTopic.value, onChatMessage)
    // 重新监听
    socket.value.on(topic, onChatMessage)
    chatTopic.value = topic
  } else {
    list.value = []
  }
}

function setScroll() {
  nextTick(() => {
    infoRef.value?.setScrollTop(innerRef.value?.clientHeight || 9999)
  })
}

function msgMenu(data) {
  console.log('msgMenu', data)
}

onMounted(() => {
  // 简历websocket连接
  socket.value = io('ws://127.0.0.1:7001', { transports: ['websocket'] })
  // 连接后获取左侧列表
  socket.value.on('connect', () => getUserList())

  // 监听自己的发送
  socket.value.on('chat', onChatMessage)
})

onBeforeUnmount(() => {
  socket.value?.close()
})
</script>

<style lang="scss" scoped>
.es-im-container {
  width: 100%;
  height: 600px;
  display: flex;
  justify-content: space-between;
  padding: 5px;
  border: 1px solid #272323;
  border-radius: 5px;
  color: #000;
  .es-im-user-list {
    width: clamp(180px, 30%, 250px);
    background-color: #fff;
    border: 1px solid #776c6c;
    border-radius: 5px;
    .es-im-user-item {
      display: flex;
      padding: 15px 10px;
      cursor: pointer;
      &:hover,
      &.active {
        background-color: #eee;
      }
    }

    .es-im-user-content {
      flex: 1;
      font-size: 12px;
      color: #666;
      display: flex;
      flex-direction: column;
      justify-content: center;
      .es-im-title {
        font-size: 14px;
        margin-bottom: 4px;
      }
      .es-im-content .text {
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }
    }
    .es-im-user-status {
      font-size: 12px;
      color: #999;
    }
  }
  .es-im-chatbox {
    flex: 1;
    z-index: 99;
    margin-left: 10px;
    transition: width 0.3s;
    background-color: pink;
    .es-im-info {
      height: calc(100% - 150px);
      background-color: #f7f7f7;
      overflow: hidden;
      overflow-y: auto;
      .es-im-info-item {
        display: flex;
        padding: 10px;
        &.active {
          justify-content: flex-end;
          .es-im-avatar {
            margin-left: 10px;
          }
          .es-im-message .es-im-title {
            text-align: right;
          }
        }
        .es-im-avatar {
          margin-right: 10px;
          img {
            height: 36px;
            width: 36px;
          }
        }
        .es-im-message {
          .es-im-title {
            font-size: 12px;
            color: #666;
          }
          .es-im-content {
            display: flex;
            flex-direction: column;
            margin-top: 5px;
            .is-text {
              background-color: #fff;
              padding: 8px;
              border-radius: 0 5px 5px;
              max-width: 400px;
              font-size: 14px;
              word-wrap: break-word;
              white-space: break-word;
            }
          }
        }
      }
    }
    .es-im-footer {
      background-color: #fff;
      padding: 10px;
      height: 150px;
    }
    .es-im-input {
      display: flex;
      position: relative;
      .es-im-send-btn {
        margin-left: 10px;
        position: absolute;
        right: 10px;
        bottom: 10px;
      }
    }
  }

  .es-im-avatar {
    margin-right: 10px;
    .es-im-avatar-img {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 40px;
      height: 40px;
      background-color: #3a7afe;
      border-radius: 4px;
      font-size: 18px;
      color: #fff;
    }
  }
}
</style>
