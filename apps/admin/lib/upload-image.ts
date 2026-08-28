import type { createSupabaseServerClient } from "@system2026/database/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 5;

async function uploadImageFile(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  file: File,
  bucket: string,
): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "الملف المرفوع يجب أن يكون صورة" };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

// يرفع ملف صورة من FormData إلى bucket محدد بـ Supabase Storage (عام
// بالقراءة، أدمن فقط بالكتابة عبر RLS — راجع migrations الصور).
// يُرجع الرابط العام، أو undefined إن لم يُرفق ملف بهذا الحقل.
export async function uploadImage(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  formData: FormData,
  fieldName: string,
  bucket: string,
): Promise<{ url?: string; error?: string }> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return {};
  return uploadImageFile(supabase, file, bucket);
}

// يرفع كل ملفات الصور المرفقة تحت نفس اسم الحقل (حد أقصى MAX_PRODUCT_IMAGES)
// — يُستخدم لحقل ملفات متعدد (multiple) بفورم المنتج. يتوقف عند أول خطأ رفع.
export async function uploadImages(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  formData: FormData,
  fieldName: string,
  bucket: string,
): Promise<{ urls: string[]; error?: string }> {
  const files = formData
    .getAll(fieldName)
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PRODUCT_IMAGES);

  const urls: string[] = [];
  for (const file of files) {
    const { url, error } = await uploadImageFile(supabase, file, bucket);
    if (error) return { urls, error };
    if (url) urls.push(url);
  }
  return { urls };
}
