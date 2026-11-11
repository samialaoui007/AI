# MCP Media Generator · لوحة عربية RTL

مشروع Next.js + TypeScript + Turso مع أدوات MCP خمس وواجهة إدارة عربية. **هذه نسخة أولية قابلة للتطوير، وليست نسخة إنتاج اجتازت اختبارات التكامل.** لم تتوفر إمكانية تشغيل `npm install` والاختبارات المتصلة بالخدمات ضمن بيئة إعداد المشروع.

## البدء

```bash
npm install
cp .env.example .env.local
# ضع قيمك الجديدة في .env.local؛ لا تستخدم رموزاً سبق مشاركتها علناً
npm run dev
```

افتح http://localhost:3000، أدخل `ADMIN_TOKEN` في لوحة الإدارة، ثم أضف مفتاح Kie.ai جديداً من واجهة المفاتيح.

## Vercel

1. ادفع ملفات المشروع إلى مستودع GitHub **دون ملف .env.local**.
2. في Vercel افتح **Add New → Project** ثم اختر المستودع.
3. Framework = Next.js وRoot Directory = `./` (أو المجلد المخصص إذا كان داخل مستودع متعدد المشاريع).
4. أضف من Settings → Environment Variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_TOKEN`, `MCP_ACCESS_TOKEN`. أضف `MERGER_API_BASE` فقط بعد نشر خدمة دمج متوافقة.
5. اضغط Deploy ثم جرّب `/api/health` ولوحة المفاتيح و `/mcp`.

## الأمن

- كل مفاتيح Turso وKie وGitHub التي كانت في أي محادثة أو سجل يجب تدويرها قبل الاستخدام الحقيقي.
- `.env*` مستثنى من Git؛ `.env.example` بدون أسرار.
- لوحة إدارة المفاتيح محمية بـ ADMIN_TOKEN؛ استدعاءات MCP محمية بـ MCP_ACCESS_TOKEN. انشر عبر HTTPS فقط.
- لا تستخدم واجهة إدارة عامة بدون رموز وصول قوية أو طبقة حماية إضافية.
- يعرض `/api/keys` قيمة masked فقط؛ لا يعيد قيمة المفتاح.

## الوظائف والقيود

- `generate_image` صورة بنموذج `gpt-image-2-6/flare-text-to-image`.
- `generate_video` فيديو بنموذج `grok-imagine-video-1-5-preview`.
- `get_task` يجلب تحديث الحالة من Kie ويعيد روابط النتائج.
- `list_media` يسترجع أحدث النتائج من Turso.
- `merge_videos` يتطلب خدمة مستقلة في `MERGER_API_BASE`؛ الخدمة غير متضمنة في هذا المستودع.
- التبديل بين مفاتيح **Kie** بالتسلسل موجود. تهيئة CometAPI في لوحة الإدارة موجودة، لكن التوليد عبر CometAPI غير مفعل لأن توافق مسارات الموديلات المطلوبة لم يُتحقق منه.
- في Vercel لا يُضمن البث الحي لتقدم مهام طويلة، ولا يُضمن تنفيذ عمل خلفي بعد انتهاء طلب HTTP. لهذا يجب تتبع المهام عبر `get_task`، ويفضل استخدام callbacks/worker لتصميم إنتاجي.
- الدمج يتطلب خادماً منفصلاً يستطيع معالجة الفيديو؛ لا تضع مفاتيح خدمة الدمج في واجهة المتصفح.

## نقاط النهاية

| Endpoint | الحماية | الوصف |
|---|---|---|
| GET `/api/health` | عام | حالة Turso والموديلات |
| GET/POST `/api/keys` | ADMIN_TOKEN | قائمة وإضافة مفاتيح |
| PATCH/DELETE `/api/keys/:id` | ADMIN_TOKEN | تعديل وحذف |
| GET `/api/tasks` | ADMIN_TOKEN | المهام والإحصائيات |
| POST `/api/generate` | ADMIN_TOKEN | توليد عبر الواجهة |
| POST `/mcp` | MCP_ACCESS_TOKEN | أدوات MCP الرسمية |

## التحقق المطلوب قبل الإنتاج

```bash
npm run typecheck
npm run build
npm test
```

يلزم أيضاً اختبار توليد صورة وفيديو حقيقيين، التبديل بين المفاتيح، والدمج المتصل بخادم حقيقي. **هذه الخطوات لم تنفّذ بعد** ولا ينبغي اعتبارها ناجحة.
