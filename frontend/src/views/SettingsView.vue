<template>
  <div class="page-card settings-page">
    <el-tabs v-model="tab">
      <el-tab-pane label="基础设置" name="basic">
        <el-form label-width="110px" style="max-width: 640px" @submit.prevent="onSave">
          <el-form-item label="单位名称">
            <el-input v-model="form.companyName" placeholder="用于打印单据抬头" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.contact" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.phone" />
          </el-form-item>
          <el-form-item label="单位地址">
            <el-input v-model="form.address" />
          </el-form-item>
          <el-form-item label="默认单位">
            <el-input v-model="form.defaultUnit" placeholder="如：件" style="width: 160px" />
          </el-form-item>
          <el-form-item label="备注说明">
            <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选，展示在打印页脚等位置" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" native-type="submit">保存设置</el-button>
            <el-button @click="onResetBasic">恢复默认</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="关于我们" name="about">
        <el-form label-width="110px" style="max-width: 720px" @submit.prevent="onSave">
          <el-form-item label="产品名称">
            <el-input v-model="form.aboutTitle" />
          </el-form-item>
          <el-form-item label="版本号">
            <el-input v-model="form.aboutVersion" style="width: 200px" />
          </el-form-item>
          <el-form-item label="关于内容">
            <el-input
              v-model="form.aboutContent"
              type="textarea"
              :rows="8"
              placeholder="介绍公司/产品定位、服务范围等"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" native-type="submit">保存</el-button>
          </el-form-item>
        </el-form>
        <div class="preview-card">
          <h3>{{ form.aboutTitle || '关于我们' }}</h3>
          <p class="muted">版本 {{ form.aboutVersion || '-' }}</p>
          <div class="preview-body">{{ form.aboutContent || '暂无介绍' }}</div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="帮助" name="help">
        <el-form label-width="110px" style="max-width: 720px" @submit.prevent="onSave">
          <el-form-item label="帮助标题">
            <el-input v-model="form.helpTitle" />
          </el-form-item>
          <el-form-item label="使用说明">
            <el-input
              v-model="form.helpContent"
              type="textarea"
              :rows="10"
              placeholder="填写常见操作步骤、功能说明等"
            />
          </el-form-item>
          <el-form-item label="常见问题">
            <el-input
              v-model="form.helpFaq"
              type="textarea"
              :rows="8"
              placeholder="每行一条，如：Q：如何新建入库？ A：进入入库登记点击新建…"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" native-type="submit">保存</el-button>
          </el-form-item>
        </el-form>
        <div class="preview-card">
          <h3>{{ form.helpTitle || '帮助中心' }}</h3>
          <div class="preview-body">{{ form.helpContent || '暂无帮助内容' }}</div>
          <h4>常见问题</h4>
          <pre class="preview-faq">{{ form.helpFaq || '暂无 FAQ' }}</pre>
        </div>
      </el-tab-pane>

      <el-tab-pane label="客服" name="support">
        <el-form label-width="110px" style="max-width: 640px" @submit.prevent="onSave">
          <el-form-item label="客服热线">
            <el-input v-model="form.supportPhone" placeholder="如：400-000-0000" />
          </el-form-item>
          <el-form-item label="客服邮箱">
            <el-input v-model="form.supportEmail" placeholder="如：support@example.com" />
          </el-form-item>
          <el-form-item label="工作时间">
            <el-input v-model="form.supportHours" placeholder="如：工作日 9:00-18:00" />
          </el-form-item>
          <el-form-item label="微信/企微">
            <el-input v-model="form.supportWechat" placeholder="客服微信号或企业微信" />
          </el-form-item>
          <el-form-item label="客服说明">
            <el-input v-model="form.supportContent" type="textarea" :rows="5" placeholder="补充说明、报修流程等" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" native-type="submit">保存</el-button>
          </el-form-item>
        </el-form>
        <div class="preview-card support-preview">
          <h3>联系客服</h3>
          <p><span>热线</span>{{ form.supportPhone || '-' }}</p>
          <p><span>邮箱</span>{{ form.supportEmail || '-' }}</p>
          <p><span>时间</span>{{ form.supportHours || '-' }}</p>
          <p><span>微信</span>{{ form.supportWechat || '-' }}</p>
          <div class="preview-body">{{ form.supportContent || '暂无客服说明' }}</div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'jxc_system_settings'

type SystemSettings = {
  companyName: string
  contact: string
  phone: string
  address: string
  defaultUnit: string
  remark: string
  aboutTitle: string
  aboutVersion: string
  aboutContent: string
  helpTitle: string
  helpContent: string
  helpFaq: string
  supportPhone: string
  supportEmail: string
  supportHours: string
  supportWechat: string
  supportContent: string
}

const defaults: SystemSettings = {
  companyName: '研物通',
  contact: '',
  phone: '',
  address: '',
  defaultUnit: '件',
  remark: '',
  aboutTitle: '关于研物通',
  aboutVersion: 'v1.0.0',
  aboutContent:
    '研物通面向实验室与课题组，提供商品入库、出库、发票对账与财务统计，帮助高效管理物资与往来账目。',
  helpTitle: '帮助中心',
  helpContent:
    '1. 在商品库维护物品档案\n2. 入库/出库登记可搜索或手输商品\n3. 发票对账可标记到账状态\n4. 财务统计可查看流水与年底对账',
  helpFaq:
    'Q：忘记密码怎么办？\nA：请联系管理员在账号管理中重置密码。\n\nQ：如何打印单据？\nA：进入入库/出库列表，点击「打印」即可。',
  supportPhone: '',
  supportEmail: '',
  supportHours: '工作日 9:00-18:00',
  supportWechat: '',
  supportContent: '如遇紧急问题，请优先拨打客服热线，我们将尽快协助处理。',
}

const tab = ref('basic')
const saving = ref(false)
const form = reactive<SystemSettings>({ ...defaults })

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    Object.assign(form, defaults, JSON.parse(raw))
  } catch {
    Object.assign(form, defaults)
  }
}

function onSave() {
  saving.value = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...form }))
    ElMessage.success('系统设置已保存')
  } finally {
    saving.value = false
  }
}

function onResetBasic() {
  form.companyName = defaults.companyName
  form.contact = defaults.contact
  form.phone = defaults.phone
  form.address = defaults.address
  form.defaultUnit = defaults.defaultUnit
  form.remark = defaults.remark
  onSave()
}

onMounted(load)
</script>

<style scoped>
.settings-page :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.preview-card {
  margin-top: 20px;
  max-width: 720px;
  padding: 16px 18px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
}

.preview-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.preview-card h4 {
  margin: 14px 0 8px;
  font-size: 14px;
}

.muted {
  margin: 0 0 10px;
  color: #8c8c8c;
  font-size: 13px;
}

.preview-body {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #434343;
  font-size: 14px;
}

.preview-faq {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #595959;
}

.support-preview p {
  display: flex;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 14px;
}

.support-preview span {
  width: 40px;
  color: #8c8c8c;
}
</style>
