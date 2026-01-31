-- ========================================
-- 贾维斯的电商 SaaS 兼容性数据库架构
-- 完美兼容现有前端代码的动态品类设计
-- ========================================

-- 1. 品类表 (categories) - 保持现有结构
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, -- 兼容现有字符串ID (如: 'cat_powerbank')
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 品类参数模板表 (category_templates)
-- 核心：存储不同品类的动态参数规范，完全对应前端 constants.ts
CREATE TABLE IF NOT EXISTS category_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL, -- 对应前端 ProductField.id (如: 'capacity_mah')
    field_name TEXT NOT NULL, -- 对应前端 ProductField.name
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'url', 'image', 'textarea', 
        'rating', 'select', 'date', 'multi_select_quantity'
    )),
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB, -- 对应前端 ProductField.options
    validation_rules JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(category_id, field_key)
);

-- 3. 品牌表 (brands)
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo TEXT,
    description TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 产品表 (products) - 完全兼容现有前端字段
-- 核心设计：固定字段 + attributes JSONB = 现有 content 字段的升级版
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, -- 兼容现有字符串ID (如: 'm1', 'p_xxxxx')
    
    -- 核心固定字段 (前端直接使用)
    category_id TEXT NOT NULL REFERENCES categories(id),
    brand TEXT, -- 兼容现有 brand 字符串字段
    model TEXT, -- 兼容现有 model 字段 (产品名/型号)
    main_image TEXT, -- 兼容现有 mainImage 字段
    
    -- 销售数据 (固定字段，前端直接使用)
    price DECIMAL(10,2), -- 兼容现有 price
    monthly_sales INTEGER DEFAULT 0, -- 兼容现有 monthlySales
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5), -- 兼容现有 rating
    
    -- 链接信息 (固定字段，前端直接使用)
    link_url TEXT, -- 产品链接
    
    -- 渠道信息 (固定字段，前端直接使用)
    channel TEXT, -- 兼容现有 channel
    
    -- 时间戳字段 (前端直接使用)
    created_at BIGINT, -- 兼容现有 createdAt (数字时间戳)
    updated_at BIGINT, -- 兼容现有 updatedAt (数字时间戳)
    updated_by TEXT, -- 兼容现有 updatedBy
    
    -- 核心动态参数字段 (JSONB) - 替代现有 content 字段
    -- 存储品类特定参数：period, dataReliability, sellingPoints, 
    -- marketDiff, proPoints, conPoints, targetAudience, capacity_mah, max_output 等
    -- 注意：不包含核心字段 (brand, model, link_url, channel, price, monthly_sales, rating, main_image)
    attributes JSONB DEFAULT '{}',
    
    -- 元数据
    is_active BOOLEAN DEFAULT true,
    
    -- JSONB 字段索引优化
    -- 使用 GIN 索引支持高效的 JSONB 查询
);

-- ========================================
-- 索引优化 (性能关键)
-- ========================================

-- 基础索引 (对应前端查询)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_channel ON products(channel);
CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- JSONB 属性查询索引 (GIN)
-- 支持高效的动态参数查询，如: WHERE attributes->>'capacity_mah' = '10000'
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING GIN (attributes);

-- 品类模板索引
CREATE INDEX IF NOT EXISTS idx_category_templates_category_id ON category_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_category_templates_is_active ON category_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_category_templates_sort_order ON category_templates(sort_order);

-- ========================================
-- 兼容性示例数据 (完全对应现有前端数据)
-- ========================================

-- 插入现有品类 (对应 constants.ts)
INSERT INTO categories (id, name, description) VALUES 
    ('cat_powerbank', '移动电源 (3C)', '移动电源、充电宝等便携式电源产品'),
    ('cat_charger', '充电器/适配器 (3C)', '各类充电器、电源适配器产品')
ON CONFLICT (id) DO NOTHING;

-- 插入示例品牌
INSERT INTO brands (id, name, website) VALUES 
    ('brand_anker', 'Anker', 'https://anker.com'),
    ('brand_apple', 'Apple', 'https://apple.com')
ON CONFLICT (id) DO NOTHING;

-- 移动电源品类参数模板 (对应 POWERBANK_FIELDS)
INSERT INTO category_templates (category_id, field_key, field_name, field_type, is_required, sort_order) VALUES 
    -- 基础系统字段 (BASE_SYSTEM_FIELDS)
    ('cat_powerbank', 'period', '记录日期', 'date', true, 1),
    ('cat_powerbank', 'shopName', '店铺名', 'text', false, 2),
    ('cat_powerbank', 'actualPrice', '到手价/券后', 'number', false, 3),
    
    -- 调研字段 (RESEARCH_FIELDS)
    ('cat_powerbank', 'url', '产品链接URL', 'url', false, 10),
    ('cat_powerbank', 'dataReliability', '数据可信度', 'select', false, 11),
    ('cat_powerbank', 'sellingPoints', '核心卖点 (USP)', 'textarea', false, 12),
    ('cat_powerbank', 'marketDiff', '差异化/空白机会', 'textarea', false, 13),
    ('cat_powerbank', 'proPoints', '好评高频词', 'text', false, 14),
    ('cat_powerbank', 'conPoints', '差评高频词', 'text', false, 15),
    ('cat_powerbank', 'targetAudience', '场景/人群分析', 'text', false, 16),
    
    -- 品类特定字段
    ('cat_powerbank', 'capacity_mah', '容量 (mAh)', 'number', false, 20),
    ('cat_powerbank', 'max_output', '最大输出 (W)', 'number', false, 21)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- 充电器品类参数模板 (对应 CHARGER_FIELDS)
INSERT INTO category_templates (category_id, field_key, field_name, field_type, is_required, sort_order) VALUES 
    -- 基础系统字段
    ('cat_charger', 'period', '记录日期', 'date', true, 1),
    ('cat_charger', 'shopName', '店铺名', 'text', false, 2),
    ('cat_charger', 'actualPrice', '到手价/券后', 'number', false, 3),
    
    -- 调研字段
    ('cat_charger', 'url', '产品链接URL', 'url', false, 10),
    ('cat_charger', 'dataReliability', '数据可信度', 'select', false, 11),
    ('cat_charger', 'sellingPoints', '核心卖点 (USP)', 'textarea', false, 12),
    ('cat_charger', 'marketDiff', '差异化/空白机会', 'textarea', false, 13),
    ('cat_charger', 'proPoints', '好评高频词', 'text', false, 14),
    ('cat_charger', 'conPoints', '差评高频词', 'text', false, 15),
    ('cat_charger', 'targetAudience', '场景/人群分析', 'text', false, 16),
    
    -- 品类特定字段
    ('cat_charger', 'max_power', '总功率 (W)', 'number', false, 20)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- 更新选项数据 (对应前端 options)
UPDATE category_templates SET options = '["Amazon.co.jp", "楽天市場", "Yahoo!JP", "Qoo10", "Direct", "B2B"]' 
WHERE category_id IN ('cat_powerbank', 'cat_charger') AND field_key = 'channel';

UPDATE category_templates SET options = '["高 (确凿数据)", "中 (经验估算)", "低 (仅供参考)"]' 
WHERE category_id IN ('cat_powerbank', 'cat_charger') AND field_key = 'dataReliability';

-- 插入兼容性示例产品 (对应 MOCK_PRODUCTS)
INSERT INTO products (
    id, category_id, brand, model, price, monthly_sales, rating, 
    main_image, created_at, channel, attributes
) VALUES (
    'm1', 
    'cat_powerbank', 
    'Anker', 
    '737 Power Bank (GaNPrime)', 
    19990, 
    4500, 
    4.8, 
    'https://picsum.photos/seed/m1/400/500',
    EXTRACT(EPOCH FROM NOW())::BIGINT * 1000, -- 转换为毫秒时间戳
    'Amazon.co.jp',
    '{
        "period": "' || CURRENT_DATE || '",
        "shopName": "",
        "actualPrice": null,
        "url": "",
        "dataReliability": "高 (确凿数据)",
        "sellingPoints": "支持PD 3.1 140W双向快充，带智能数显屏。",
        "marketDiff": "",
        "proPoints": "",
        "conPoints": "",
        "targetAudience": "",
        "capacity_mah": null,
        "max_output": null
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 兼容性视图 (用于前端查询)
-- ========================================

-- 产品详情视图 (模拟现有前端数据结构)
-- 这个视图返回的数据结构与前端期望的 ProductData 完全一致
CREATE VIEW product_details_compatible AS
SELECT 
    p.id,
    p.category_id as "categoryId",
    p.created_at as "createdAt",
    p.updated_at as "updatedAt",
    p.updated_by as "updatedBy",
    p.brand,
    p.model,
    p.price,
    p.monthly_sales as "monthlySales",
    p.rating,
    p.main_image as "mainImage",
    p.channel,
    p.shop_name as "shopName",
    p.actual_price as "actualPrice",
    -- 将 attributes 中的所有字段展开到顶层 (模拟现有 ...p.content 行为)
    p.attributes.*
FROM products p
WHERE p.is_active = true;

-- 品类模板视图 (用于前端获取表单配置)
-- 完全对应前端 Category.fields 结构
CREATE VIEW category_form_configs AS
SELECT 
    c.id as "categoryId",
    c.name,
    ct.field_key as "id",
    ct.field_name as "name",
    ct.field_type as "type",
    ct.is_required as "required",
    ct.default_value,
    ct.options,
    ct.validation_rules,
    ct.sort_order
FROM categories c
JOIN category_templates ct ON c.id = ct.category_id
WHERE c.is_active = true AND ct.is_active = true
ORDER BY c.sort_order, ct.sort_order;

-- ========================================
-- 触发器 (自动更新时间戳)
-- ========================================

-- 自动更新 updated_at 时间戳 (数字格式，兼容前端)
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- ========================================
-- RLS (Row Level Security) 策略
-- ========================================

-- 启用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 基础读取策略
CREATE POLICY "Allow read access for authenticated users" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON category_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON brands
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

-- 写入策略
CREATE POLICY "Allow full access for admins" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON category_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON brands
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON products
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 编辑权限
CREATE POLICY "Allow edit access for editors" ON products
    FOR INSERT, UPDATE, DELETE USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

-- ========================================
-- 数据迁移函数 (从现有 content 字段迁移)
-- ========================================

-- 迁移函数：将现有 content 字段数据拆分到固定字段和 attributes
CREATE OR REPLACE FUNCTION migrate_product_data()
RETURNS void AS $$
DECLARE
    product_record RECORD;
    attr_json jsonb;
BEGIN
    -- 这个函数用于从现有的 content 字段迁移数据
    -- 在实际迁移时调用：SELECT migrate_product_data();
    
    FOR product_record IN 
        SELECT id, content FROM products WHERE content IS NOT NULL AND content != '{}'
    LOOP
        attr_json := product_record.content::jsonb;
        
        -- 将动态字段移动到 attributes
        UPDATE products SET 
            attributes = jsonb_build_object(
                'period', attr_json->>'period',
                'shopName', attr_json->>'shopName', 
                'actualPrice', attr_json->>'actualPrice',
                'url', attr_json->>'url',
                'dataReliability', attr_json->>'dataReliability',
                'sellingPoints', attr_json->>'sellingPoints',
                'marketDiff', attr_json->>'marketDiff',
                'proPoints', attr_json->>'proPoints',
                'conPoints', attr_json->>'conPoints',
                'targetAudience', attr_json->>'targetAudience',
                'capacity_mah', attr_json->>'capacity_mah',
                'max_output', attr_json->>'max_output',
                'max_power', attr_json->>'max_power'
            )
        WHERE id = product_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
