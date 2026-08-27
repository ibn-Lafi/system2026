import { z } from "zod";

export const updateCompanyInfoSchema = z.object({
  companyName: z.string().min(1, "اسم الشركة مطلوب"),
  vatRegistrationNumber: z.string().min(1, "الرقم الضريبي مطلوب"),
  commercialRegistrationNumber: z.string().optional(),
  companyAddress: z.string().optional(),
});

export const updateInvoiceGracePeriodSchema = z.object({
  invoiceEditGracePeriodMinutes: z.number().int().positive(),
});

export const updateExpiryAlertThresholdSchema = z.object({
  expiryAlertDaysThreshold: z.number().int().positive(),
});

export const updateStoreBrandingSchema = z.object({
  storeName: z.string().min(1, "اسم المتجر مطلوب"),
  heroKicker: z.string().min(1, "النص العلوي مطلوب"),
  heroTitle: z.string().min(1, "عنوان الرئيسية مطلوب"),
  siteDescription: z.string().optional(),
});

export const updateStoreSocialLinksSchema = z.object({
  whatsappNumber: z.string().optional(),
  instagramUrl: z.string().url("رابط انستغرام غير صالح").optional().or(z.literal("")),
  tiktokUrl: z.string().url("رابط تيك توك غير صالح").optional().or(z.literal("")),
});

export const updateStoreHomepageSectionsSchema = z.object({
  showPointsOfSaleSection: z.boolean().default(true),
});

export const updateStoreThemeSchema = z.object({
  useDefaultTheme: z.boolean().default(true),
  customCss: z.string().optional(),
  customHtml: z.string().optional(),
});

export const SECTION_TYPES = ["promo_banner", "features", "testimonials"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SectionType, string> = {
  promo_banner: "بانر دعائي",
  features: "مميزاتنا",
  testimonials: "آراء العملاء",
};

export const moveSectionSchema = z.object({
  sectionType: z.enum(SECTION_TYPES),
  direction: z.enum(["up", "down"]),
});

export const updatePromoBannerContentSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
});

export const updateFeaturesContentSchema = z.object({
  title1: z.string().optional(),
  desc1: z.string().optional(),
  title2: z.string().optional(),
  desc2: z.string().optional(),
  title3: z.string().optional(),
  desc3: z.string().optional(),
});

export const updateTestimonialsContentSchema = z.object({
  name1: z.string().optional(),
  text1: z.string().optional(),
  name2: z.string().optional(),
  text2: z.string().optional(),
  name3: z.string().optional(),
  text3: z.string().optional(),
});

export type UpdateCompanyInfoInput = z.infer<typeof updateCompanyInfoSchema>;
export type UpdateInvoiceGracePeriodInput = z.infer<typeof updateInvoiceGracePeriodSchema>;
export type UpdateExpiryAlertThresholdInput = z.infer<typeof updateExpiryAlertThresholdSchema>;
export type UpdateStoreBrandingInput = z.infer<typeof updateStoreBrandingSchema>;
export type UpdateStoreSocialLinksInput = z.infer<typeof updateStoreSocialLinksSchema>;
export type UpdateStoreHomepageSectionsInput = z.infer<typeof updateStoreHomepageSectionsSchema>;
export type UpdateStoreThemeInput = z.infer<typeof updateStoreThemeSchema>;
export type UpdatePromoBannerContentInput = z.infer<typeof updatePromoBannerContentSchema>;
export type UpdateFeaturesContentInput = z.infer<typeof updateFeaturesContentSchema>;
export type UpdateTestimonialsContentInput = z.infer<typeof updateTestimonialsContentSchema>;

export const updateStoreLandingModeSchema = z.object({
  showLandingPage: z.boolean().default(false),
});

export const submitStoreLeadSchema = z.object({
  phoneNumber: z.string().regex(/^9665[0-9]{8}$/, "رقم جوال سعودي غير صالح (مثال: 9665xxxxxxxx)"),
  desiredStore: z.string().min(3, "الرجاء وصف ما ترغب بفتحه"),
});

export type UpdateStoreLandingModeInput = z.infer<typeof updateStoreLandingModeSchema>;
export type SubmitStoreLeadInput = z.infer<typeof submitStoreLeadSchema>;
