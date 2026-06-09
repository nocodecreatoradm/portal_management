-- 1. Create ID_PORTAL schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ID_PORTAL')
BEGIN
    EXEC('CREATE SCHEMA ID_PORTAL');
END
GO

-- 2. Drop existing tables if they exist (in reverse dependency order)
IF OBJECT_ID('ID_PORTAL.role_permissions', 'U') IS NOT NULL DROP TABLE ID_PORTAL.role_permissions;
IF OBJECT_ID('ID_PORTAL.permissions', 'U') IS NOT NULL DROP TABLE ID_PORTAL.permissions;
IF OBJECT_ID('ID_PORTAL.calendar_tasks', 'U') IS NOT NULL DROP TABLE ID_PORTAL.calendar_tasks;
IF OBJECT_ID('ID_PORTAL.innovation_proposals', 'U') IS NOT NULL DROP TABLE ID_PORTAL.innovation_proposals;
IF OBJECT_ID('ID_PORTAL.energy_efficiency_records', 'U') IS NOT NULL DROP TABLE ID_PORTAL.energy_efficiency_records;
IF OBJECT_ID('ID_PORTAL.project_activities', 'U') IS NOT NULL DROP TABLE ID_PORTAL.project_activities;
IF OBJECT_ID('ID_PORTAL.projects', 'U') IS NOT NULL DROP TABLE ID_PORTAL.projects;
IF OBJECT_ID('ID_PORTAL.rd_inventory', 'U') IS NOT NULL DROP TABLE ID_PORTAL.rd_inventory;
IF OBJECT_ID('ID_PORTAL.product_management', 'U') IS NOT NULL DROP TABLE ID_PORTAL.product_management;
IF OBJECT_ID('ID_PORTAL.products', 'U') IS NOT NULL DROP TABLE ID_PORTAL.products;
IF OBJECT_ID('ID_PORTAL.samples', 'U') IS NOT NULL DROP TABLE ID_PORTAL.samples;
IF OBJECT_ID('ID_PORTAL.inspection_templates', 'U') IS NOT NULL DROP TABLE ID_PORTAL.inspection_templates;
IF OBJECT_ID('ID_PORTAL.categories', 'U') IS NOT NULL DROP TABLE ID_PORTAL.categories;
IF OBJECT_ID('ID_PORTAL.product_lines', 'U') IS NOT NULL DROP TABLE ID_PORTAL.product_lines;
IF OBJECT_ID('ID_PORTAL.suppliers', 'U') IS NOT NULL DROP TABLE ID_PORTAL.suppliers;
IF OBJECT_ID('ID_PORTAL.brand_documents', 'U') IS NOT NULL DROP TABLE ID_PORTAL.brand_documents;
IF OBJECT_ID('ID_PORTAL.brandbook_documents', 'U') IS NOT NULL DROP TABLE ID_PORTAL.brandbook_documents; -- cleanup old name if exists
IF OBJECT_ID('ID_PORTAL.brands', 'U') IS NOT NULL DROP TABLE ID_PORTAL.brands;
IF OBJECT_ID('ID_PORTAL.profiles', 'U') IS NOT NULL DROP TABLE ID_PORTAL.profiles;
IF OBJECT_ID('ID_PORTAL.roles', 'U') IS NOT NULL DROP TABLE ID_PORTAL.roles;
IF OBJECT_ID('ID_PORTAL.ntp_regulations', 'U') IS NOT NULL DROP TABLE ID_PORTAL.ntp_regulations;
IF OBJECT_ID('ID_PORTAL.brandbook_settings', 'U') IS NOT NULL DROP TABLE ID_PORTAL.brandbook_settings;
IF OBJECT_ID('ID_PORTAL.approver_configs', 'U') IS NOT NULL DROP TABLE ID_PORTAL.approver_configs;
IF OBJECT_ID('ID_PORTAL.rd_custom_projects', 'U') IS NOT NULL DROP TABLE ID_PORTAL.rd_custom_projects;
IF OBJECT_ID('ID_PORTAL.rd_project_templates', 'U') IS NOT NULL DROP TABLE ID_PORTAL.rd_project_templates;
IF OBJECT_ID('ID_PORTAL.audit_logs', 'U') IS NOT NULL DROP TABLE ID_PORTAL.audit_logs;
GO

-- 3. Create Tables

-- ROLES
CREATE TABLE ID_PORTAL.roles (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    name nvarchar(100) NOT NULL UNIQUE,
    display_name nvarchar(255) NOT NULL,
    description nvarchar(max),
    [level] int DEFAULT 0
);

-- PERMISSIONS
CREATE TABLE ID_PORTAL.permissions (
    id int IDENTITY(1,1) PRIMARY KEY,
    name nvarchar(100) NOT NULL UNIQUE,
    description nvarchar(max),
    module nvarchar(100) NOT NULL
);

-- PROFILES (Users)
CREATE TABLE ID_PORTAL.profiles (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    email nvarchar(255) NOT NULL UNIQUE,
    full_name nvarchar(255) NOT NULL,
    department nvarchar(255),
    [role] nvarchar(100), -- User's main display role name
    role_id uniqueidentifier REFERENCES ID_PORTAL.roles(id), -- Linked role object
    password_hash nvarchar(255), -- For local secure auth
    is_active bit DEFAULT 1,
    avatar_url nvarchar(max),
    scopes nvarchar(max) DEFAULT '[]',
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- ROLE_PERMISSIONS
CREATE TABLE ID_PORTAL.role_permissions (
    role_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.roles(id) ON DELETE CASCADE,
    permission_id int NOT NULL REFERENCES ID_PORTAL.permissions(id) ON DELETE CASCADE,
    CONSTRAINT PK_role_permissions PRIMARY KEY (role_id, permission_id)
);

-- BRANDS
CREATE TABLE ID_PORTAL.brands (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    name nvarchar(255) NOT NULL,
    image nvarchar(max),
    description nvarchar(max),
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- SUPPLIERS
CREATE TABLE ID_PORTAL.suppliers (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    legal_name nvarchar(255) NOT NULL,
    commercial_alias nvarchar(255) NOT NULL,
    erp_code nvarchar(100) NOT NULL,
    country nvarchar(255),
    logo_url nvarchar(max),
    contacts nvarchar(max),
    website nvarchar(255),
    wechat nvarchar(100),
    email nvarchar(255),
    evaluation nvarchar(max), -- JSON format
    quotations nvarchar(max), -- JSON array of file info
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- PRODUCT_LINES
CREATE TABLE ID_PORTAL.product_lines (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    name nvarchar(255) NOT NULL,
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- CATEGORIES
CREATE TABLE ID_PORTAL.categories (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    name nvarchar(255) NOT NULL,
    product_line_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.product_lines(id) ON DELETE CASCADE,
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- INSPECTION_TEMPLATES
CREATE TABLE ID_PORTAL.inspection_templates (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    category_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.categories(id) ON DELETE CASCADE,
    name nvarchar(255) NOT NULL,
    form_structure nvarchar(max), -- JSON format
    workflow_structure nvarchar(max), -- JSON format
    procedure_file nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- SAMPLES
CREATE TABLE ID_PORTAL.samples (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    correlative_id nvarchar(100) NOT NULL,
    [version] int DEFAULT 1,
    codigo_sap nvarchar(100),
    descripcion_sap nvarchar(255) NOT NULL,
    brand_id uniqueidentifier REFERENCES ID_PORTAL.brands(id),
    supplier_id uniqueidentifier REFERENCES ID_PORTAL.suppliers(id),
    line_id uniqueidentifier REFERENCES ID_PORTAL.product_lines(id),
    category_id uniqueidentifier REFERENCES ID_PORTAL.categories(id),
    sample_type nvarchar(100),
    inspection_date datetime2,
    inspection_status nvarchar(100),
    report_date datetime2,
    report_file nvarchar(max), -- JSON format
    initial_technical_datasheet nvarchar(max), -- JSON format
    technician uniqueidentifier REFERENCES ID_PORTAL.profiles(id), -- User uuid
    planned_start_date datetime2,
    inspection_progress nvarchar(100),
    inspection_completed_date datetime2,
    inspection_timer nvarchar(max), -- JSON format
    inspection_form nvarchar(max), -- JSON format (array of sections)
    workflow nvarchar(max), -- JSON format (array of stages)
    info_requests nvarchar(max), -- JSON format
    provider_documents nvarchar(max), -- JSON format
    gallery nvarchar(max), -- JSON format
    reception_photo nvarchar(max), -- JSON format
    received_by nvarchar(255),
    warehouse_entry_date datetime2,
    calculation_ids nvarchar(max), -- JSON format
    history nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- PRODUCTS
CREATE TABLE ID_PORTAL.products (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    correlative_id nvarchar(100),
    sap_code nvarchar(100) NOT NULL UNIQUE,
    ean_code nvarchar(100),
    sap_description nvarchar(255),
    brand_id uniqueidentifier REFERENCES ID_PORTAL.brands(id),
    supplier_id uniqueidentifier REFERENCES ID_PORTAL.suppliers(id),
    line_id uniqueidentifier REFERENCES ID_PORTAL.product_lines(id),
    sample_id uniqueidentifier REFERENCES ID_PORTAL.samples(id),
    category_id uniqueidentifier REFERENCES ID_PORTAL.categories(id),
    commercial_status nvarchar(100),
    quality_inspection_date datetime2,
    fob_price decimal(18, 4) DEFAULT 0,
    fob_price_history nvarchar(max), -- JSON format
    explode_files nvarchar(max), -- JSON format
    additional_provider_documents nvarchar(max), -- JSON format
    gallery nvarchar(max), -- JSON format
    artwork_assignment nvarchar(max), -- JSON format
    technical_assignment nvarchar(max), -- JSON format
    commercial_assignment nvarchar(max), -- JSON format
    tracking_type nvarchar(100),
    linked_group_id uniqueidentifier,
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- PRODUCT_MANAGEMENT
CREATE TABLE ID_PORTAL.product_management (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    correlative_id nvarchar(100),
    sap_code nvarchar(100),
    sap_description nvarchar(255),
    ean_code nvarchar(100),
    brand_id uniqueidentifier REFERENCES ID_PORTAL.brands(id),
    supplier_id uniqueidentifier REFERENCES ID_PORTAL.suppliers(id),
    line_id uniqueidentifier REFERENCES ID_PORTAL.product_lines(id),
    sample_id nvarchar(100),
    category_id uniqueidentifier REFERENCES ID_PORTAL.categories(id),
    fob_price decimal(18, 4) DEFAULT 0,
    fob_price_history nvarchar(max), -- JSON format
    explode_files nvarchar(max), -- JSON format
    additional_provider_documents nvarchar(max), -- JSON format
    gallery nvarchar(max), -- JSON format
    approved_documents nvarchar(max), -- JSON format
    artwork_assignment nvarchar(max), -- JSON format
    technical_assignment nvarchar(max), -- JSON format
    commercial_assignment nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- RD_INVENTORY
CREATE TABLE ID_PORTAL.rd_inventory (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    serial_number nvarchar(100),
    description nvarchar(max) NOT NULL,
    responsible nvarchar(255),
    acquisition_date datetime2,
    startup_date datetime2,
    calibration_status nvarchar(100),
    category nvarchar(100),
    equipment_type nvarchar(100),
    source_type nvarchar(100),
    brand nvarchar(100),
    model nvarchar(100),
    equipment_range nvarchar(100),
    supplier_or_equipment nvarchar(255),
    calibration_registry nvarchar(255),
    revision_registry nvarchar(255),
    certificate nvarchar(max),
    certificate_history nvarchar(max), -- JSON format
    revision_status nvarchar(100),
    assignment_registry nvarchar(255),
    last_calibration_date datetime2,
    next_calibration_date datetime2,
    photos nvarchar(max), -- JSON format
    manual nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- PROJECTS (Roadmap)
CREATE TABLE ID_PORTAL.projects (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    project_number nvarchar(100),
    name nvarchar(255) NOT NULL,
    responsible uniqueidentifier REFERENCES ID_PORTAL.profiles(id),
    progress decimal(5, 2) DEFAULT 0,
    status nvarchar(100),
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- PROJECT_ACTIVITIES
CREATE TABLE ID_PORTAL.project_activities (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    project_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.projects(id) ON DELETE CASCADE,
    activity_number nvarchar(100),
    name nvarchar(255) NOT NULL,
    comments nvarchar(max),
    indicator nvarchar(255),
    progress decimal(5, 2) DEFAULT 0,
    responsible nvarchar(max), -- JSON format (array of names/emails/ids)
    classification nvarchar(100),
    planned_start_date datetime2,
    planned_end_date datetime2,
    actual_start_date datetime2,
    actual_end_date datetime2,
    status nvarchar(100),
    daily_progress nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- ENERGY_EFFICIENCY_RECORDS
CREATE TABLE ID_PORTAL.energy_efficiency_records (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    codigo_mt nvarchar(100) NOT NULL,
    descripcion nvarchar(max),
    letra nvarchar(10),
    porcentaje_ee nvarchar(50),
    ocp nvarchar(100),
    supplier_id uniqueidentifier REFERENCES ID_PORTAL.suppliers(id),
    fecha_emision datetime2,
    fecha_vigilancia datetime2,
    tipo_producto nvarchar(100),
    sample_id uniqueidentifier REFERENCES ID_PORTAL.samples(id),
    certificado_file nvarchar(max), -- JSON format
    certificado_history nvarchar(max), -- JSON format
    etiqueta_file nvarchar(max), -- JSON format
    etiqueta_history nvarchar(max), -- JSON format
    test_report_file nvarchar(max), -- JSON format
    test_report_history nvarchar(max), -- JSON format
    gallery nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- INNOVATION_PROPOSALS
CREATE TABLE ID_PORTAL.innovation_proposals (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    title nvarchar(255) NOT NULL,
    description nvarchar(max),
    category nvarchar(100),
    author nvarchar(255),
    [date] datetime2,
    status nvarchar(100),
    priority nvarchar(100),
    images nvarchar(max), -- JSON format
    sketches nvarchar(max), -- JSON format
    blueprints nvarchar(max), -- JSON format
    tags nvarchar(max), -- JSON format
    comments nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- CALENDAR_TASKS
CREATE TABLE ID_PORTAL.calendar_tasks (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    title nvarchar(255) NOT NULL,
    description nvarchar(max),
    deadline datetime2,
    start_date datetime2,
    end_date datetime2,
    [type] nvarchar(100),
    requester uniqueidentifier REFERENCES ID_PORTAL.profiles(id),
    assignee uniqueidentifier REFERENCES ID_PORTAL.profiles(id),
    status nvarchar(100),
    delivery_status nvarchar(100),
    change_log nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- NTP_REGULATIONS
CREATE TABLE ID_PORTAL.ntp_regulations (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    code nvarchar(100) NOT NULL,
    title nvarchar(255) NOT NULL,
    category nvarchar(100),
    upload_date datetime2,
    [file] nvarchar(max), -- JSON format (file info)
    description nvarchar(max),
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- BRANDBOOK_SETTINGS
CREATE TABLE ID_PORTAL.brandbook_settings (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    hero_image nvarchar(max),
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- BRAND_DOCUMENTS
CREATE TABLE ID_PORTAL.brand_documents (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    brand_id uniqueidentifier REFERENCES ID_PORTAL.brands(id),
    parent_id uniqueidentifier REFERENCES ID_PORTAL.brand_documents(id),
    name nvarchar(255) NOT NULL,
    [type] nvarchar(50) NOT NULL, -- 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'folder'
    modified datetime2,
    modified_by nvarchar(255),
    versions nvarchar(max) -- JSON format
);

-- APPROVER_CONFIGS
CREATE TABLE ID_PORTAL.approver_configs (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    id_approver nvarchar(255),
    mkt_approver nvarchar(255),
    plan_approver nvarchar(255),
    prov_approver nvarchar(255),
    is_active bit DEFAULT 1,
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- RD_PROJECT_TEMPLATES
CREATE TABLE ID_PORTAL.rd_project_templates (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    name nvarchar(255) NOT NULL,
    description nvarchar(max),
    icon nvarchar(100),
    background_image nvarchar(max),
    is_custom bit DEFAULT 0,
    sections nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- RD_CUSTOM_PROJECTS
CREATE TABLE ID_PORTAL.rd_custom_projects (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    template_id uniqueidentifier REFERENCES ID_PORTAL.rd_project_templates(id),
    name nvarchar(255) NOT NULL,
    description nvarchar(max),
    status nvarchar(100),
    priority nvarchar(100),
    responsible_id uniqueidentifier REFERENCES ID_PORTAL.profiles(id), -- Linked user
    start_date datetime2,
    end_date datetime2,
    sections nvarchar(max), -- JSON format
    attachments nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE(),
    updated_at datetime2 DEFAULT GETDATE()
);

-- AUDIT_LOGS
CREATE TABLE ID_PORTAL.audit_logs (
    id uniqueidentifier PRIMARY KEY DEFAULT newid(),
    user_email nvarchar(255),
    user_name nvarchar(255),
    action nvarchar(100),
    entity_type nvarchar(100),
    entity_id nvarchar(255),
    entity_name nvarchar(255),
    previous_data nvarchar(max), -- JSON format
    new_data nvarchar(max), -- JSON format
    created_at datetime2 DEFAULT GETDATE()
);
GO
