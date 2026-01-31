-- ========================================
-- 贾维斯的电商 SaaS 动态品类数据库架构
-- 基于 JSONB 动态参数模式设计
-- ========================================

-- 1. 品类表 (categories)
-- 存储基础品类信息
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- 品类图标
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 品类参数模板表 (category_templates)
-- 核心：存储不同品类的动态参数规范 (Schema)
CREATE TABLE IF NOT EXISTS category_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL, -- 参数键名 (如: capacity_mah, screen_size)
    field_name TEXT NOT NULL, -- 显示名称 (如: 容量, 屏幕尺寸)
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'url', 'image', 'textarea', 
        'rating', 'select', 'date', 'multi_select_quantity'
    )),
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB, -- 用于 select, multi_select_quantity 类型的选项
    validation_rules JSONB, -- Zod 验证规则
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
    logo TEXT, -- 品牌 logo URL
    description TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 产品表 (products) - 核心表
-- 统一表结构 + 动态 JSONB 参数字段
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 核心固定字段 (所有产品共有)
    category_id UUID NOT NULL REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    sku TEXT, -- 商品编码
    title TEXT NOT NULL, -- 产品标题
    description TEXT, -- 产品描述
    main_image TEXT, -- 主图 URL
    
    -- 销售数据 (固定字段)
    price DECIMAL(10,2), -- 价格
    compare_price DECIMAL(10,2), -- 划线价
    cost_price DECIMAL(10,2), -- 成本价
    monthly_sales INTEGER DEFAULT 0, -- 月销量
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5), -- 评分
    review_count INTEGER DEFAULT 0, -- 评论数
    
    -- 渠道信息 (固定字段)
    channel TEXT, -- 销售渠道
    shop_name TEXT, -- 店铺名
    product_url TEXT, -- 商品链接
    
    -- 核心动态参数字段 (JSONB)
    -- 存储该品类的所有自定义参数，如: {"capacity_mah": "10000", "screen_size": "6.1"}
    attributes JSONB DEFAULT '{}',
    
    -- 元数据
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT, -- 最后更新人
    
    -- JSONB 字段索引优化
    -- 使用 GIN 索引支持高效的 JSONB 查询
);

-- ========================================
-- 索引优化 (性能关键)
-- ========================================

-- 基础索引
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_channel ON products(channel);
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
-- 示例数据插入 (便于测试)
-- ========================================

-- 插入示例品类
INSERT INTO categories (id, name, description) VALUES 
    ('cat_phone', '智能手机', '各类智能手机产品'),
    ('cat_clothing', '服装', '男女装、童装等服装产品')
ON CONFLICT (id) DO NOTHING;

-- 插入示例品牌
INSERT INTO brands (id, name, website) VALUES 
    ('brand_apple', 'Apple', 'https://apple.com'),
    ('brand_samsung', 'Samsung', 'https://samsung.com'),
    ('brand_nike', 'Nike', 'https://nike.com')
ON CONFLICT (id) DO NOTHING;

-- 智能手机品类参数模板
INSERT INTO category_templates (category_id, field_key, field_name, field_type, is_required, sort_order) VALUES 
    -- 手机核心参数
    ('cat_phone', 'screen_size', '屏幕尺寸', 'text', true, 1),
    ('cat_phone', 'storage', '存储容量', 'select', true, 2),
    ('cat_phone', 'ram', '运行内存', 'select', true, 3),
    ('cat_phone', 'battery_capacity', '电池容量', 'number', false, 4),
    ('cat_phone', 'camera_mp', '主摄像头像素', 'number', false, 5),
    ('cat_phone', 'processor', '处理器型号', 'text', false, 6),
    ('cat_phone', 'color', '颜色', 'select', false, 7),
    ('cat_phone', 'network_type', '网络类型', 'select', false, 8),
    ('cat_phone', 'water_resistance', '防水等级', 'select', false, 9)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- 更新手机品类的选项数据
UPDATE category_templates SET options = '["64GB", "128GB", "256GB", "512GB", "1TB"]' 
WHERE category_id = 'cat_phone' AND field_key = 'storage';

UPDATE category_templates SET options = '["4GB", "6GB", "8GB", "12GB", "16GB"]' 
WHERE category_id = 'cat_phone' AND field_key = 'ram';

UPDATE category_templates SET options = '["黑色", "白色", "蓝色", "红色", "金色", "绿色"]' 
WHERE category_id = 'cat_phone' AND field_key = 'color';

UPDATE category_templates SET options = '["5G", "4G LTE", "双卡双待"]' 
WHERE category_id = 'cat_phone' AND field_key = 'network_type';

UPDATE category_templates SET options = '["IP68", "IP67", "IP52", "无防水"]' 
WHERE category_id = 'cat_phone' AND field_key = 'water_resistance';

-- 服装品类参数模板
INSERT INTO category_templates (category_id, field_key, field_name, field_type, is_required, sort_order) VALUES 
    -- 服装核心参数
    ('cat_clothing', 'size', '尺码', 'select', true, 1),
    ('cat_clothing', 'material', '材质', 'text', true, 2),
    ('cat_clothing', 'season', '季节', 'select', false, 3),
    ('cat_clothing', 'style', '风格', 'select', false, 4),
    ('cat_clothing', 'gender', '性别', 'select', false, 5),
    ('cat_clothing', 'origin', '产地', 'text', false, 6)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- 更新服装品类的选项数据
UPDATE category_templates SET options = '["XS", "S", "M", "L", "XL", "XXL", "3XL"]' 
WHERE category_id = 'cat_clothing' AND field_key = 'size';

UPDATE category_templates SET options = '["春季", "夏季", "秋季", "冬季", "四季"]' 
WHERE category_id = 'cat_clothing' AND field_key = 'season';

UPDATE category_templates SET options = '["休闲", "商务", "运动", "时尚", "复古", "街头"]' 
WHERE category_id = 'cat_clothing' AND field_key = 'style';

UPDATE category_templates SET options = '["男装", "女装", "中性", "童装"]' 
WHERE category_id = 'cat_clothing' AND field_key = 'gender';

-- ========================================
-- 触发器 (自动更新 updated_at)
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_templates_updated_at BEFORE UPDATE ON category_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS (Row Level Security) 策略
-- ========================================

-- 启用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 基础读取策略 (允许所有认证用户读取)
CREATE POLICY "Allow read access for authenticated users" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON category_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON brands
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

-- 写入策略 (根据用户角色控制)
CREATE POLICY "Allow full access for admins" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON category_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON brands
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow full access for admins" ON products
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 编辑权限 (允许编辑者修改产品)
CREATE POLICY "Allow edit access for editors" ON products
    FOR INSERT, UPDATE, DELETE USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

-- ========================================
-- 视图 (简化查询)
-- ========================================

-- 产品详情视图 (包含品类和品牌信息)
CREATE VIEW product_details AS
SELECT 
    p.id,
    p.title,
    p.price,
    p.monthly_sales,
    p.rating,
    p.main_image,
    p.channel,
    p.attributes,
    p.created_at,
    p.updated_at,
    c.name as category_name,
    b.name as brand_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.is_active = true;

-- 品类模板视图 (便于前端获取表单配置)
CREATE VIEW category_form_configs AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    ct.field_key,
    ct.field_name,
    ct.field_type,
    ct.is_required,
    ct.default_value,
    ct.options,
    ct.validation_rules,
    ct.sort_order
FROM categories c
JOIN category_templates ct ON c.id = ct.category_id
WHERE c.is_active = true AND ct.is_active = true
ORDER BY c.sort_order, ct.sort_order;
