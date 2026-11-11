# MCP Media Generator

سيرفر MCP لتوليد الصور والفيديوهات بالذكاء الاصطناعي + دمج الفيديوهات — مع تبديل تلقائي تسلسلي بين مفاتيح API دون أي توقف.

AI media generation MCP server (image + video + video merging) with automatic **sequential multi-key failover** — tasks never stop when a key runs out of balance.

## ✨ المزايا

- **5 أدوات MCP**: `generate_image` · `generate_video` · `merge_videos` · `get_task` · `list_media`
- **تبديل مفاتيح تسلسلي**: أول مفتاح ← التالي ← التالي — عند نفاد رصيد أي مفتاح تنتقل المهمة تلقائيًا للمفتاح التالي بنفس `task_id` دون انقطاع، والعميل (GPT) يرى «قيد المعالجة» فقط
- **لا مفتاح يتوقف أبدًا**: حتى المفاتيح المنتهية تبقى في الدورة (تشحن رصيدها فتكمل المهام المعلّقة لوحدها مع كل استعلام `get_task`)
- **تخزين Turso**: كل المهام وروابط النتائج محفوظة في قاعدة بيانات libSQL (لا تُنزَّل الوسائط على السيرفر)
- **تقدم مباشر**: إشعارات progress أثناء التوليد والدمج
- **واجهة إدارة**: إضافة/تعطيل/فحص المفاتيح من المتصفح + عرض آخر المهام

## 🧩 الموديلات

| النوع | الموديل | المزودون |
|---|---|---|
| صورة | `gpt-image-2-6/flare-text-to-image` | kie.ai / CometAPI |
| فيديو | `grok-imagine-video-1-5-preview` (صوت متزامن) | kie.ai / CometAPI |
| دمج | خدمة دمج خارجية (MP4/H.264+AAC حتى 1080p، حتى 10 مقاطع) | بلا مفاتيح |

## 🔧 متغيرات البيئة

| المتغير | إلزامي | الوصف |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | رابط قاعدة Turso مثل `turso://<db>.turso.io` |
| `TURSO_AUTH_TOKEN` | ✅ | توكن قاعدة Turso |
| `MERGER_API_BASE` | — | عنوان خدمة الدمج (افتراضي: `https://dmg1.vercel.app`) |
| `MCP_ACCESS_TOKEN` | — | حماية اختيارية لمسار `/mcp` بـ `Authorization: Bearer` |

انسخ `.env.example` إلى `.env` واملأ القيم.

## 🚀 التشغيل محليًا

```bash
bun install
bun run dev        # http://localhost:3000
```

## ☁️ النشر على Vercel

1. ارفع المشروع على GitHub (هذا الريبو)
2. على [vercel.com](https://vercel.com) → **Add New → Project** → اختر الريبو
3. أضف متغيرات البيئة (`TURSO_DATABASE_URL` و `TURSO_AUTH_TOKEN` على الأقل) من **Settings → Environment Variables**
4. اضغط **Deploy** (يكتشف Next.js تلقائيًا)
5. بعد النشر: رابط MCP هو `https://<your-app>.vercel.app/mcp`

> ملاحظة: سيرفر الدمج الخارجي يحذف الملفات بعد 24 ساعة — حمّل الفيديو المدمج بدري.

## 🔌 الربط مع ChatGPT / أي عميل MCP

أضف السيرفر من واجهة الربط في الصفحة الرئيسية («ربط السيرفر») أو يدويًا:

```json
{
  "mcpServers": {
    "media-generator": {
      "url": "https://<your-app>.vercel.app/mcp"
    }
  }
}
```

سير العمل: `generate_image` / `generate_video` ← لو رجع `task_id` بحالة PROCESSING تابع باستعلام `get_task` كل ~10 ثوانٍ حتى تظهر النتيجة. لدمج عدة مقاطع: `merge_videos` بروابط مباشرة أو `task_ids` لمهام مكتملة.

## 🔑 إدارة المفاتيح

من الصفحة الرئيسية أضف مفاتيح kie.ai / CometAPI لكل مزود — التصنيف الذكي للأخطاء:

- `401/403` مفتاح مرفوض ← انتقال تلقائي للتالي
- `402/نقص رصيد` ← انتقال تلقائي والتقاط المهام لاحقًا عند الشحن
- `429/5xx/شبكة` ← انتقال تلقائي وإعادة المحاولة
- `400/422` معطيات خاطئة ← إيقاف فوري (التبديل لا يحلها)
