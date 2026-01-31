-- ========================================
-- 数据库字段扩展与核心竞品数据注入
-- ========================================

-- 1. 扩展 category_templates 表，为移动电源品类添加DIY字段
INSERT INTO category_templates (
    category_id, 
    field_key, 
    field_name, 
    field_type, 
    field_options, 
    is_required, 
    display_order, 
    created_at
) VALUES 
-- 移动电源品类 - DIY字段
('cat_powerbank', 'selling_points', '卖点数组', 'multi_select_quantity', 
 ARRAY['PSE认证', 'LCD残量显示', '防灾应急推荐', 'MagSafe磁吸', 'Qi无线充', '强磁力', '停电对策', '口袋便携'], 
 false, 100, NOW()),

('cat_powerbank', 'pros', '好评词云', 'textarea', null, false, 101, NOW()),
('cat_powerbank', 'cons', '差评词云', 'textarea', null, false, 102, NOW()),
('cat_powerbank', 'raw_review', '典型原句', 'textarea', null, false, 103, NOW()),
('cat_powerbank', 'insight_summary', '专家洞察', 'textarea', null, false, 104, NOW())

ON CONFLICT (category_id, field_key) DO UPDATE SET
    field_name = EXCLUDED.field_name,
    field_type = EXCLUDED.field_type,
    field_options = EXCLUDED.field_options,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 2. 注入竞品A数据：SHRATCH B18
INSERT INTO products (
    id,
    category_id,
    brand,
    model,
    link_url,
    channel,
    price,
    monthly_sales,
    rating,
    main_image,
    attributes,
    created_at,
    updated_at,
    updated_by
) VALUES (
    'p_shratch_b18',
    'cat_powerbank',
    'SHRATCH',
    'B18',
    'https://shopping.yahoo.co.jp/products/shratch-b18',
    'Yahoo Shopping',
    2999,
    1500,
    4.43,
    'https://example.com/images/shratch-b18.jpg',
    JSONB_BUILD_OBJECT(
        'capacity_mah', 22000,
        'weight_g', 200,
        'interfaces', '集成3线+4台同充',
        'selling_points', ARRAY['PSE认证', 'LCD残量显示', '防灾应急推荐'],
        'pros', '大容量、コンパクト、デザインが良い',
        'cons', '实容量偏低、Lightning线易断、充电到99%闪烁无法满电',
        'raw_review', '充电到99%闪烁无法满电，这是关键痛点！',
        'insight_summary', '容量虚标问题严重，充电逻辑存在缺陷，但设计感和便携性获得用户认可'
    ),
    NOW(),
    NOW(),
    'system'
) ON CONFLICT (id) DO UPDATE SET
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    link_url = EXCLUDED.link_url,
    channel = EXCLUDED.channel,
    price = EXCLUDED.price,
    monthly_sales = EXCLUDED.monthly_sales,
    rating = EXCLUDED.rating,
    main_image = EXCLUDED.main_image,
    attributes = EXCLUDED.attributes,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;

-- 3. 注入竞品B数据：FIPRIN 7226set
INSERT INTO products (
    id,
    category_id,
    brand,
    model,
    link_url,
    channel,
    price,
    monthly_sales,
    rating,
    main_image,
    attributes,
    created_at,
    updated_at,
    updated_by
) VALUES (
    'p_fiprin_7226set',
    'cat_powerbank',
    'FIPRIN',
    '7226set',
    'https://shopping.yahoo.co.jp/products/fiprin-7226set',
    'Yahoo Shopping',
    3680,
    2200,
    4.97,
    'https://example.com/images/fiprin-7226set.jpg',
    JSONB_BUILD_OBJECT(
        'capacity_mah', 10000,
        'weight_g', 125,
        'features', 'MagSafe磁吸、2个捆绑套装',
        'selling_points', ARRAY['强磁力', 'Qi无线充', '停电对策', '口袋便携'],
        'pros', '吸力强、出门不用带线',
        'cons', '无线充发热、没有电量百分比显示',
        'raw_review', '无线充发热严重，但没有电量显示更让人焦虑',
        'insight_summary', '磁吸技术领先，但热管理和电量显示是明显短板，套装策略提升客单价'
    ),
    NOW(),
    NOW(),
    'system'
) ON CONFLICT (id) DO UPDATE SET
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    link_url = EXCLUDED.link_url,
    channel = EXCLUDED.channel,
    price = EXCLUDED.price,
    monthly_sales = EXCLUDED.monthly_sales,
    rating = EXCLUDED.rating,
    main_image = EXCLUDED.main_image,
    attributes = EXCLUDED.attributes,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;

-- 4. 确保移动电源品类存在
INSERT INTO categories (
    id, 
    name, 
    description, 
    icon, 
    created_at, 
    updated_at
) VALUES (
    'cat_powerbank',
    '移动电源',
    '便携式充电设备，包含各种容量和规格的移动电源产品',
    'battery-charging',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 5. 验证数据注入结果
SELECT 
    p.id,
    p.brand,
    p.model,
    p.price,
    p.rating,
    p.channel,
    p.attributes->>'selling_points' as selling_points,
    p.attributes->>'pros' as pros,
    p.attributes->>'cons' as cons,
    p.attributes->>'raw_review' as raw_review,
    p.attributes->>'insight_summary' as insight_summary
FROM products p 
WHERE p.id IN ('p_shratch_b18', 'p_fiprin_7226set')
ORDER BY p.rating DESC;
