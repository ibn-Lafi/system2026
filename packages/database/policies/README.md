# RLS Policies — نسخة قابلة للقراءة

المصدر الملزم هو `migrations/20260813120003_rls_policies.sql`. هذا الملف توثيق
مختصر لمن يريد فهم من يصل لأي جدول بدون قراءة SQL.

**المبدأ:** Deny by default — أي جدول بدون سطر أدناه لعملية معيّنة = ممنوعة كليًا،
حتى للأدمن، من الفرونت إند مباشرة (تمر فقط عبر RPC Function بصلاحية SECURITY DEFINER).

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | صاحب الصف، أو أدمن/محاسب | trigger فقط (signup) | صاحب الصف، أو أدمن | ممنوع |
| `categories`, `units`, `products`, `product_units` | كل مستخدم مسجّل دخول | أدمن فقط | أدمن فقط | أدمن فقط |
| `suppliers`, `purchase_invoices`, `purchase_invoice_items` | أدمن/محاسب | أدمن فقط (عبر RPC) | أدمن فقط (عبر RPC) | ممنوع |
| `supplier_payments` | أدمن/محاسب | عبر RPC فقط | ممنوع | ممنوع |
| `warehouse_stock` | أدمن/محاسب | عبر RPC فقط | عبر RPC فقط | ممنوع |
| `stock_transfers`, `stock_transfer_items` | أدمن/محاسب، والمندوب لعملياته هو فقط | عبر RPC فقط | ممنوع | ممنوع |
| `stock_movements` | أدمن/محاسب، والمندوب لحركاته هو فقط | trigger/RPC فقط | ممنوع | ممنوع |
| `customers` | أدمن/محاسب، والمندوب لعملائه فقط | أدمن، أو مندوب (عميل جديد بخط سيره) | أدمن فقط | ممنوع |
| `customer_reps` | أدمن/محاسب، والمندوب لصفوفه فقط | أدمن، أو مندوب لنفسه | أدمن فقط | ممنوع |
| `rep_inventory` | أدمن/محاسب، والمندوب لرصيده فقط | عبر RPC فقط | عبر RPC فقط | ممنوع |
| `invoices`, `invoice_items` | أدمن/محاسب، والمندوب لفواتيره فقط | عبر RPC فقط | عبر RPC فقط | **ممنوع نهائيًا لأي دور** (Append-only، راجع CLAUDE.md §4.5) |
| `credit_notes` | أدمن/محاسب، والمندوب لفواتيره فقط | عبر RPC فقط | ممنوع | ممنوع |
| `payments` | أدمن/محاسب، والمندوب لعملائه فقط | عبر RPC فقط | ممنوع | ممنوع |
| `return_records`, `return_items` | أدمن/محاسب، والمندوب لمرتجعاته فقط | عبر RPC فقط | ممنوع | ممنوع |
| `system_settings` | كل مستخدم مسجّل دخول | seed migration فقط | أدمن فقط | ممنوع |
| `audit_logs` | أدمن فقط | trigger فقط | ممنوع | ممنوع |

**زوار المتجر (anon):** لا وصول مباشر لأي جدول أعلاه إطلاقًا. الوصول العام فقط
عبر Views مخصصة (`public_store_locations`, `public_products`, `public_categories`
بملف `migrations/20260813120004_public_views.sql`) تحدد الأعمدة والصفوف المسموحة صراحة.
