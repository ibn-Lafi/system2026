// أنواع TypeScript مطابقة لمخطط قاعدة البيانات (migrations/). يُفضَّل استبدالها
// بالمولَّدة فعليًا من supabase CLI فور ربط مشروع Supabase حقيقي:
//   supabase gen types typescript --project-id <project-id> > packages/database/types.ts
// (يجب أن تتطابق البنية لأنها تعكس نفس migrations هنا). تبسيط مقصود هنا: كل
// "Update" مبني كـ Partial لشكل "Insert" بدل تكرار كل الحقول يدويًا.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ملاحظة: "Insert" هنا تحكم شكل .insert()، و"Update" مبنية افتراضيًا كـ
// Partial<Insert> — إلا إذا مُرِّر UpdateShape صراحةً (لجداول تُمنع من INSERT
// مباشر بالكامل عبر RLS لكنها تسمح بـ UPDATE، مثل system_settings).
type Table<Row, Insert, UpdateShape = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: UpdateShape;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_active?: boolean;
        }
      >;
      categories: Table<
        {
          id: string;
          name: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        },
        { id?: string; name: string; image_url?: string | null }
      >;
      units: Table<
        { id: string; name: string; created_at: string; updated_at: string },
        { id?: string; name: string }
      >;
      products: Table<
        {
          id: string;
          name: string;
          description: string | null;
          price: number;
          average_cost: number;
          category_id: string | null;
          supplier_id: string | null;
          image_url: string | null;
          visible_in_store: boolean;
          is_active: boolean;
          has_expiry: boolean;
          expiry_date: string | null;
          base_unit_id: string;
          image_urls: string[];
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          average_cost?: number;
          category_id?: string | null;
          supplier_id?: string | null;
          image_url?: string | null;
          visible_in_store?: boolean;
          is_active?: boolean;
          has_expiry?: boolean;
          expiry_date?: string | null;
          base_unit_id: string;
          image_urls?: string[];
        }
      >;
      product_units: Table<
        {
          id: string;
          product_id: string;
          unit_id: string;
          conversion_factor_to_base: number;
          unit_price: number | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          product_id: string;
          unit_id: string;
          conversion_factor_to_base: number;
          unit_price?: number | null;
        }
      >;
      suppliers: Table<
        {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          notes: string | null;
          commercial_registration_number: string | null;
          vat_number: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          commercial_registration_number?: string | null;
          vat_number?: string | null;
        }
      >;
      purchase_invoices: Table<
        {
          id: string;
          invoice_number: number;
          supplier_id: string;
          invoice_date: string;
          subtotal: number;
          total_amount: number;
          payment_status: Database["public"]["Enums"]["purchase_payment_status"];
          attachment_path: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          invoice_number?: number;
          supplier_id: string;
          subtotal?: number;
          total_amount?: number;
          payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
          attachment_path?: string | null;
          created_by: string;
        }
      >;
      purchase_invoice_items: Table<
        {
          id: string;
          purchase_invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_cost: number;
          subtotal: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          purchase_invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_cost: number;
          subtotal: number;
        }
      >;
      supplier_payments: Table<
        {
          id: string;
          purchase_invoice_id: string | null;
          supplier_id: string;
          amount: number;
          payment_date: string;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          purchase_invoice_id?: string | null;
          supplier_id: string;
          amount: number;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
        }
      >;
      warehouse_stock: Table<
        { id: string; product_id: string; quantity_available: number; created_at: string; updated_at: string },
        { id?: string; product_id: string; quantity_available?: number }
      >;
      stock_movements: Table<
        {
          id: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          reference_table: string;
          reference_id: string;
          product_id: string;
          location_type: Database["public"]["Enums"]["stock_location_type"];
          location_id: string | null;
          quantity_change: number;
          balance_after: number;
          notes: string | null;
          performed_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          movement_type: Database["public"]["Enums"]["stock_movement_type"];
          reference_table: string;
          reference_id: string;
          product_id: string;
          location_type: Database["public"]["Enums"]["stock_location_type"];
          location_id?: string | null;
          quantity_change: number;
          balance_after: number;
          notes?: string | null;
          performed_by?: string | null;
        }
      >;
      customers: Table<
        {
          id: string;
          name: string;
          shop_name: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          google_maps_link: string | null;
          commercial_registration_number: string | null;
          vat_number: string | null;
          show_in_store: boolean;
          city_id: string | null;
          loyalty_points: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          shop_name?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          google_maps_link?: string | null;
          commercial_registration_number?: string | null;
          vat_number?: string | null;
          show_in_store?: boolean;
          city_id?: string | null;
        }
      >;
      cities: Table<
        { id: string; name: string; created_at: string; updated_at: string },
        { id?: string; name: string }
      >;
      customer_branches: Table<
        {
          id: string;
          customer_id: string;
          name: string;
          shop_name: string | null;
          address: string | null;
          city_id: string | null;
          phone: string | null;
          google_maps_link: string | null;
          show_in_store: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          customer_id: string;
          name: string;
          shop_name?: string | null;
          address?: string | null;
          city_id?: string | null;
          phone?: string | null;
          google_maps_link?: string | null;
          show_in_store?: boolean;
        }
      >;
      loyalty_point_movements: Table<
        {
          id: string;
          customer_id: string;
          points_change: number;
          balance_after: number;
          reason: string;
          performed_by: string | null;
          created_at: string;
        },
        never // لا INSERT مباشر — عبر add_loyalty_points() فقط
      >;
      customer_complaints: Table<
        {
          id: string;
          customer_id: string;
          branch_id: string | null;
          description: string;
          status: Database["public"]["Enums"]["customer_complaint_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          customer_id: string;
          branch_id?: string | null;
          description: string;
          status?: Database["public"]["Enums"]["customer_complaint_status"];
          created_by?: string | null;
        }
      >;
      invoices: Table<
        {
          id: string;
          invoice_number: number;
          customer_id: string;
          invoice_date: string;
          subtotal: number;
          vat_amount: number;
          total_amount: number;
          qr_code_data: string;
          payment_method: Database["public"]["Enums"]["invoice_payment_method"];
          status: Database["public"]["Enums"]["invoice_status"];
          discount_percentage: number;
          branch_id: string | null;
          notes: string | null;
          sale_channel: Database["public"]["Enums"]["invoice_sale_channel"];
          created_at: string;
          updated_at: string;
        },
        never // لا INSERT مباشر — عبر create_invoice_with_stock_check() فقط
      >;
      invoice_items: Table<
        {
          id: string;
          invoice_id: string;
          product_id: string;
          unit_id: string;
          quantity_in_unit: number;
          quantity_in_base_unit: number;
          unit_price: number;
          cost_price: number;
          subtotal: number;
          created_at: string;
          updated_at: string;
        },
        never
      >;
      invoice_edit_requests: Table<
        {
          id: string;
          invoice_id: string;
          requested_by: string;
          reason: string;
          requested_changes: Json;
          status: Database["public"]["Enums"]["edit_request_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        { id?: string; invoice_id: string; requested_by: string; reason: string; requested_changes: Json }
      >;
      credit_notes: Table<
        {
          id: string;
          invoice_id: string;
          amount: number;
          reason: string;
          created_by: string;
          note_date: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر RPC فقط (إلغاء/موافقة تعديل)
      >;
      payments: Table<
        {
          id: string;
          invoice_id: string | null;
          customer_id: string;
          amount: number;
          payment_date: string;
          method: Database["public"]["Enums"]["settlement_method"];
          recorded_by: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر record_customer_payment() فقط
      >;
      return_records: Table<
        {
          id: string;
          invoice_id: string | null;
          customer_id: string;
          return_date: string;
          total_credit_amount: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        never // عبر process_return() فقط
      >;
      return_items: Table<
        {
          id: string;
          return_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          condition: Database["public"]["Enums"]["return_condition"];
          created_at: string;
          updated_at: string;
        },
        never
      >;
      system_settings: Table<
        {
          id: number;
          company_name: string;
          vat_registration_number: string;
          commercial_registration_number: string;
          company_address: string;
          invoice_edit_grace_period_minutes: number;
          expiry_alert_days_threshold: number;
          loyalty_riyals_per_point: number;
          updated_at: string;
          updated_by: string | null;
        },
        never, // لا INSERT مباشر — صف وحيد عبر seed migration فقط
        {
          company_name?: string;
          vat_registration_number?: string;
          commercial_registration_number?: string;
          company_address?: string;
          invoice_edit_grace_period_minutes?: number;
          expiry_alert_days_threshold?: number;
          loyalty_riyals_per_point?: number;
          updated_by?: string | null;
        }
      >;
      cashier_terminals: Table<
        { id: string; name: string; pin_hash: string; is_active: boolean; created_at: string; updated_at: string },
        never // لا INSERT مباشر — عبر create_cashier_terminal() فقط
      >;
      audit_logs: Table<
        {
          id: string;
          table_name: string;
          record_id: string | null;
          action: Database["public"]["Enums"]["audit_action"];
          performed_by: string | null;
          performed_at: string;
          old_values: Json | null;
          new_values: Json | null;
        },
        never // trigger فقط
      >;
      store_settings: Table<
        {
          id: number;
          store_name: string;
          logo_url: string | null;
          hero_kicker: string;
          hero_title: string;
          site_description: string;
          whatsapp_number: string | null;
          instagram_url: string | null;
          tiktok_url: string | null;
          show_points_of_sale_section: boolean;
          custom_css: string | null;
          custom_html: string | null;
          show_landing_page: boolean;
          updated_at: string;
          updated_by: string | null;
        },
        never, // لا INSERT مباشر — صف وحيد عبر seed migration فقط
        {
          store_name?: string;
          logo_url?: string | null;
          hero_kicker?: string;
          hero_title?: string;
          site_description?: string;
          whatsapp_number?: string | null;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          show_points_of_sale_section?: boolean;
          custom_css?: string | null;
          custom_html?: string | null;
          show_landing_page?: boolean;
          updated_by?: string | null;
        }
      >;
      store_leads: Table<
        {
          id: string;
          phone_number: string;
          desired_store: string;
          created_at: string;
        },
        { id?: string; phone_number: string; desired_store: string },
        never // لا UPDATE/DELETE — للمراجعة فقط
      >;
      shifts: Table<
        { id: string; name: string; start_time: string; end_time: string; created_at: string; updated_at: string },
        { id?: string; name: string; start_time: string; end_time: string }
      >;
      employees: Table<
        {
          id: string;
          profile_id: string | null;
          full_name: string;
          national_id: string | null;
          phone: string | null;
          email: string | null;
          job_title: string | null;
          department: string | null;
          hire_date: string;
          termination_date: string | null;
          shift_id: string | null;
          basic_salary: number;
          housing_allowance: number;
          other_allowances: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          profile_id?: string | null;
          full_name: string;
          national_id?: string | null;
          phone?: string | null;
          email?: string | null;
          job_title?: string | null;
          department?: string | null;
          hire_date: string;
          termination_date?: string | null;
          shift_id?: string | null;
          basic_salary?: number;
          housing_allowance?: number;
          other_allowances?: number;
          is_active?: boolean;
        }
      >;
      attendance_records: Table<
        {
          id: string;
          employee_id: string;
          work_date: string;
          check_in: string | null;
          check_out: string | null;
          status: Database["public"]["Enums"]["hr_attendance_status"];
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          work_date: string;
          check_in?: string | null;
          check_out?: string | null;
          status?: Database["public"]["Enums"]["hr_attendance_status"];
          notes?: string | null;
        }
      >;
      employee_leave_balances: Table<
        {
          id: string;
          employee_id: string;
          leave_type: Database["public"]["Enums"]["hr_leave_type"];
          year: number;
          entitled_days: number;
          used_days: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          leave_type: Database["public"]["Enums"]["hr_leave_type"];
          year: number;
          entitled_days?: number;
          used_days?: number;
        }
      >;
      leave_requests: Table<
        {
          id: string;
          employee_id: string;
          leave_type: Database["public"]["Enums"]["hr_leave_type"];
          start_date: string;
          end_date: string;
          days_count: number;
          reason: string | null;
          status: Database["public"]["Enums"]["hr_leave_status"];
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          leave_type: Database["public"]["Enums"]["hr_leave_type"];
          start_date: string;
          end_date: string;
          days_count: number;
          reason?: string | null;
        }
      >;
      employee_advances: Table<
        {
          id: string;
          employee_id: string;
          amount: number;
          reason: string | null;
          request_date: string;
          monthly_deduction_amount: number;
          remaining_balance: number;
          status: Database["public"]["Enums"]["hr_advance_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          amount: number;
          reason?: string | null;
          request_date?: string;
          monthly_deduction_amount?: number;
          remaining_balance: number;
          status?: Database["public"]["Enums"]["hr_advance_status"];
          created_by?: string | null;
        }
      >;
      employee_custody_items: Table<
        {
          id: string;
          employee_id: string;
          item_name: string;
          description: string | null;
          assigned_date: string;
          returned_date: string | null;
          status: Database["public"]["Enums"]["hr_custody_status"];
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          item_name: string;
          description?: string | null;
          assigned_date?: string;
          returned_date?: string | null;
          status?: Database["public"]["Enums"]["hr_custody_status"];
        }
      >;
      payroll_runs: Table<
        {
          id: string;
          period_month: number;
          period_year: number;
          status: Database["public"]["Enums"]["hr_payroll_run_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        never // لا INSERT مباشر — عبر generate_payroll_run() فقط
      >;
      payroll_items: Table<
        {
          id: string;
          payroll_run_id: string;
          employee_id: string;
          basic_salary: number;
          allowances: number;
          deductions: number;
          net_salary: number;
          is_paid: boolean;
          created_at: string;
          updated_at: string;
        },
        never // لا INSERT مباشر — عبر generate_payroll_run() فقط
      >;
      wage_payments: Table<
        {
          id: string;
          payroll_item_id: string;
          payment_date: string;
          method: Database["public"]["Enums"]["settlement_method"];
          amount: number;
          created_by: string | null;
          created_at: string;
        },
        never // لا INSERT مباشر — عبر pay_payroll_item() فقط
      >;
      end_of_service_settlements: Table<
        {
          id: string;
          employee_id: string;
          termination_date: string;
          years_of_service: number;
          gratuity_amount: number;
          calculation_notes: string | null;
          created_by: string | null;
          created_at: string;
        },
        never // لا INSERT مباشر — عبر calculate_end_of_service() فقط
      >;
      performance_appraisals: Table<
        {
          id: string;
          employee_id: string;
          appraisal_period: string;
          score: number;
          strengths: string | null;
          areas_for_improvement: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          employee_id: string;
          appraisal_period: string;
          score: number;
          strengths?: string | null;
          areas_for_improvement?: string | null;
          reviewed_by?: string | null;
        }
      >;
      store_sections: Table<
        {
          id: string;
          section_type: "promo_banner" | "features" | "testimonials";
          enabled: boolean;
          display_order: number;
          content: Json;
          created_at: string;
          updated_at: string;
        },
        never, // لا INSERT/DELETE — 3 صفوف ثابتة عبر seed migration فقط
        {
          enabled?: boolean;
          display_order?: number;
          content?: Json;
        }
      >;
    };
    Views: {
      public_store_locations: {
        Row: { id: string; shop_name: string | null; google_maps_link: string | null; city_name: string | null };
        Relationships: [];
      };
      public_store_settings: {
        Row: {
          store_name: string;
          logo_url: string | null;
          hero_kicker: string;
          hero_title: string;
          site_description: string;
          whatsapp_number: string | null;
          instagram_url: string | null;
          tiktok_url: string | null;
          show_points_of_sale_section: boolean;
          custom_css: string | null;
          custom_html: string | null;
          show_landing_page: boolean;
        };
        Relationships: [];
      };
      public_store_sections: {
        Row: {
          section_type: "promo_banner" | "features" | "testimonials";
          display_order: number;
          content: Json;
        };
        Relationships: [];
      };
      public_products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category_id: string | null;
          category_name: string | null;
          base_unit_name: string;
        };
        Relationships: [];
      };
      public_categories: {
        Row: { id: string; name: string; image_url: string | null };
        Relationships: [];
      };
    };
    Functions: {
      find_or_create_customer_by_phone: {
        Args: { p_phone: string; p_name: string | null };
        Returns: string;
      };
      create_cashier_terminal: {
        Args: { p_name: string; p_pin: string };
        Returns: string;
      };
      reset_cashier_terminal_pin: {
        Args: { p_terminal_id: string; p_pin: string };
        Returns: undefined;
      };
      set_cashier_terminal_active: {
        Args: { p_terminal_id: string; p_is_active: boolean };
        Returns: undefined;
      };
      verify_cashier_terminal_pin: {
        Args: { p_pin: string };
        Returns: string | null;
      };
      create_cashier_sale: {
        Args: {
          p_terminal_id: string;
          p_customer_id: string;
          p_items: Json;
          p_payment_method: Database["public"]["Enums"]["invoice_payment_method"];
        };
        Returns: string;
      };
      create_online_store_order: {
        Args: { p_customer_id: string; p_items: Json };
        Returns: string;
      };
      create_invoice_with_stock_check: {
        Args: {
          p_customer_id: string;
          p_items: Json;
          p_payment_method: Database["public"]["Enums"]["invoice_payment_method"];
          p_discount_percentage?: number;
          p_branch_id?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      create_purchase_invoice: {
        Args: {
          p_supplier_id: string;
          p_items: Json;
          p_payment_status?: Database["public"]["Enums"]["purchase_payment_status"];
        };
        Returns: string;
      };
      set_warehouse_stock_quantity: {
        Args: { p_product_id: string; p_new_quantity: number; p_reason?: string | null };
        Returns: number;
      };
      add_loyalty_points: {
        Args: { p_customer_id: string; p_points: number; p_reason: string };
        Returns: number;
      };
      set_purchase_invoice_attachment: {
        Args: { p_purchase_invoice_id: string; p_attachment_path: string };
        Returns: undefined;
      };
      record_customer_payment: {
        Args: {
          p_customer_id: string;
          p_invoice_id: string | null;
          p_amount: number;
          p_method: Database["public"]["Enums"]["settlement_method"];
        };
        Returns: string;
      };
      record_supplier_payment: {
        Args: {
          p_supplier_id: string;
          p_purchase_invoice_id: string | null;
          p_amount: number;
          p_method: Database["public"]["Enums"]["settlement_method"];
        };
        Returns: string;
      };
      process_return: {
        Args: { p_customer_id: string; p_invoice_id: string | null; p_items: Json };
        Returns: string;
      };
      cancel_invoice_within_grace_period: {
        Args: { p_invoice_id: string; p_reason: string };
        Returns: string;
      };
      review_invoice_edit_request: {
        Args: {
          p_request_id: string;
          p_decision: Database["public"]["Enums"]["edit_request_status"];
          p_admin_notes?: string | null;
        };
        Returns: undefined;
      };
      approve_leave_request: {
        Args: { p_leave_request_id: string };
        Returns: undefined;
      };
      reject_leave_request: {
        Args: { p_leave_request_id: string };
        Returns: undefined;
      };
      generate_payroll_run: {
        Args: { p_period_month: number; p_period_year: number };
        Returns: string;
      };
      update_payroll_item_deductions: {
        Args: { p_payroll_item_id: string; p_deductions: number };
        Returns: undefined;
      };
      pay_payroll_item: {
        Args: { p_payroll_item_id: string; p_method: Database["public"]["Enums"]["settlement_method"] };
        Returns: undefined;
      };
      calculate_end_of_service: {
        Args: { p_employee_id: string; p_termination_date: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: "admin" | "accountant" | "rep" | "marketing" | "sales" | "production" | "supervisor";
      invoice_payment_method: "cash" | "credit" | "check" | "transfer";
      settlement_method: "cash" | "check" | "transfer";
      invoice_status: "paid" | "partial" | "unpaid" | "cancelled";
      purchase_payment_status: "paid" | "partial" | "unpaid";
      stock_movement_type:
        | "purchase_in"
        | "transfer_out"
        | "transfer_in"
        | "sale_out"
        | "return_in"
        | "write_off"
        | "adjustment";
      stock_location_type: "warehouse" | "rep";
      return_condition: "resalable" | "damaged" | "expired";
      edit_request_status: "pending" | "approved" | "rejected";
      audit_action: "insert" | "update" | "delete";
      invoice_sale_channel: "cashier" | "online_store";
      customer_complaint_status: "open" | "in_progress" | "resolved";
      hr_leave_type: "annual" | "sick" | "unpaid" | "other";
      hr_leave_status: "pending" | "approved" | "rejected";
      hr_attendance_status: "present" | "absent" | "late" | "on_leave";
      hr_advance_status: "pending" | "approved" | "repaid";
      hr_custody_status: "assigned" | "returned";
      hr_payroll_run_status: "draft" | "paid";
    };
  };
};
