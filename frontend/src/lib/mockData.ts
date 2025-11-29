// Mock data for PostgreSQL Database Visualizer

export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
}

export interface Schema {
  name: string;
  tables: Table[];
}

export interface Table {
  id: string;
  name: string;
  schema: string;
  rowCount: number;
  size: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description?: string;
}

export interface Index {
  name: string;
  type: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export const mockConnections: Connection[] = [
  {
    id: '1',
    name: 'Production Database',
    host: 'prod-db.example.com',
    port: 5432,
    database: 'ecommerce_prod',
    username: 'admin',
    status: 'connected',
    lastConnected: new Date('2025-01-20T10:30:00'),
  },
  {
    id: '2',
    name: 'Local Development',
    host: 'localhost',
    port: 5432,
    database: 'ecommerce_dev',
    username: 'postgres',
    status: 'connected',
    lastConnected: new Date('2025-01-20T09:15:00'),
  },
  {
    id: '3',
    name: 'Staging Environment',
    host: 'staging-db.example.com',
    port: 5432,
    database: 'ecommerce_staging',
    username: 'staging_user',
    status: 'disconnected',
  },
];

export const mockTables: Table[] = [
  {
    id: 'users',
    name: 'users',
    schema: 'public',
    rowCount: 15234,
    size: '2.3 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'email', type: 'varchar(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'username', type: 'varchar(100)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'password_hash', type: 'varchar(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'first_name', type: 'varchar(100)', nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: 'last_name', type: 'varchar(100)', nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: 'users_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'users_email_idx', type: 'btree', columns: ['email'], unique: true },
      { name: 'users_username_idx', type: 'btree', columns: ['username'], unique: true },
    ],
    foreignKeys: [],
  },
  {
    id: 'products',
    name: 'products',
    schema: 'public',
    rowCount: 4521,
    size: '1.8 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'name', type: 'varchar(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'description', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: 'price', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'stock_quantity', type: 'integer', nullable: false, defaultValue: '0', isPrimaryKey: false, isForeignKey: false },
      { name: 'category_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: 'products_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'products_category_idx', type: 'btree', columns: ['category_id'], unique: false },
    ],
    foreignKeys: [
      { name: 'products_category_fkey', columns: ['category_id'], referencedTable: 'categories', referencedColumns: ['id'] },
    ],
  },
  {
    id: 'orders',
    name: 'orders',
    schema: 'public',
    rowCount: 28345,
    size: '4.2 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'user_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: 'status', type: 'varchar(50)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'total_amount', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'shipping_address_id', type: 'uuid', nullable: true, isPrimaryKey: false, isForeignKey: true },
      { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: 'orders_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'orders_user_idx', type: 'btree', columns: ['user_id'], unique: false },
      { name: 'orders_status_idx', type: 'btree', columns: ['status'], unique: false },
    ],
    foreignKeys: [
      { name: 'orders_user_fkey', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] },
      { name: 'orders_address_fkey', columns: ['shipping_address_id'], referencedTable: 'addresses', referencedColumns: ['id'] },
    ],
  },
  {
    id: 'order_items',
    name: 'order_items',
    schema: 'public',
    rowCount: 56234,
    size: '3.1 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'order_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: 'product_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: 'quantity', type: 'integer', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'unit_price', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'total_price', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: 'order_items_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'order_items_order_idx', type: 'btree', columns: ['order_id'], unique: false },
      { name: 'order_items_product_idx', type: 'btree', columns: ['product_id'], unique: false },
    ],
    foreignKeys: [
      { name: 'order_items_order_fkey', columns: ['order_id'], referencedTable: 'orders', referencedColumns: ['id'] },
      { name: 'order_items_product_fkey', columns: ['product_id'], referencedTable: 'products', referencedColumns: ['id'] },
    ],
  },
  {
    id: 'categories',
    name: 'categories',
    schema: 'public',
    rowCount: 125,
    size: '64 KB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'name', type: 'varchar(100)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'description', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: 'parent_id', type: 'uuid', nullable: true, isPrimaryKey: false, isForeignKey: true },
    ],
    indexes: [
      { name: 'categories_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'categories_name_idx', type: 'btree', columns: ['name'], unique: true },
    ],
    foreignKeys: [
      { name: 'categories_parent_fkey', columns: ['parent_id'], referencedTable: 'categories', referencedColumns: ['id'] },
    ],
  },
  {
    id: 'addresses',
    name: 'addresses',
    schema: 'public',
    rowCount: 18234,
    size: '1.5 MB',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'user_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: 'street', type: 'varchar(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'city', type: 'varchar(100)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'state', type: 'varchar(100)', nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: 'postal_code', type: 'varchar(20)', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'country', type: 'varchar(100)', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: 'addresses_pkey', type: 'btree', columns: ['id'], unique: true },
      { name: 'addresses_user_idx', type: 'btree', columns: ['user_id'], unique: false },
    ],
    foreignKeys: [
      { name: 'addresses_user_fkey', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] },
    ],
  },
];

export const mockSchemas: Schema[] = [
  {
    name: 'public',
    tables: mockTables,
  },
];

export const mockTableData = {
  users: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'john.doe@example.com',
      username: 'johndoe',
      first_name: 'John',
      last_name: 'Doe',
      created_at: '2024-01-15 10:23:45',
      updated_at: '2024-06-20 14:30:22',
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      email: 'jane.smith@example.com',
      username: 'janesmith',
      first_name: 'Jane',
      last_name: 'Smith',
      created_at: '2024-02-10 09:15:30',
      updated_at: '2024-07-01 11:45:10',
    },
    {
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      email: 'bob.wilson@example.com',
      username: 'bobwilson',
      first_name: 'Bob',
      last_name: 'Wilson',
      created_at: '2024-03-05 15:42:18',
      updated_at: '2024-07-15 09:20:35',
    },
  ],
  products: [
    {
      id: 'd4e5f6a7-b8c9-0123-def1-234567890123',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with 6 programmable buttons',
      price: '29.99',
      stock_quantity: 250,
      category_id: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
      created_at: '2024-01-20 08:00:00',
      updated_at: '2024-07-10 16:30:00',
    },
    {
      id: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      price: '89.99',
      stock_quantity: 145,
      category_id: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
      created_at: '2024-02-01 10:30:00',
      updated_at: '2024-07-12 14:20:00',
    },
  ],
  orders: [
    {
      id: 'f6a7b8c9-d0e1-2345-f123-456789012345',
      user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      status: 'delivered',
      total_amount: '149.97',
      shipping_address_id: 'a7b8c9d0-e1f2-3456-1234-567890123456',
      created_at: '2024-06-15 14:20:30',
      updated_at: '2024-06-20 10:15:45',
    },
    {
      id: 'a7b8c9d0-e1f2-3456-1234-567890123456',
      user_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      status: 'processing',
      total_amount: '89.99',
      shipping_address_id: 'b8c9d0e1-f2a3-4567-2345-678901234567',
      created_at: '2024-07-18 09:45:12',
      updated_at: '2024-07-18 09:45:12',
    },
  ],
};
