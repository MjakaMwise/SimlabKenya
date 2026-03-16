export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_location?: string;
  delivery_address?: string;
  items: OrderItem[];
  total_amount: number;
  additional_notes?: string;
  order_status: 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid';
  created_at: string;
  updated_at: string;
  contacted_at?: string;
  completed_at?: string;
}

export interface OrderInsert {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_location?: string;
  delivery_address?: string;
  items: OrderItem[];
  total_amount: number;
  additional_notes?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  has_sizes: boolean;
  available_sizes?: string[];
  stock_quantity: number;
  is_available: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  name: string;
  description?: string;
  price: number;
  category: string;
  has_sizes?: boolean;
  available_sizes?: string[];
  stock_quantity?: number;
  is_available?: boolean;
  image_url?: string;
}

export interface AbstractFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface AbstractSubmission {
  schoolName: string;
  studentNames: string[];
  teacherName: string;
  teacherEmail: string;
  teacherContact: string;
  projectTitle: string;
  projectDescription: string;
  projectCategory: string;
}

export interface UploadedAbstractFile {
  originalName: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  mimeType: string;
  size: number;
}

export interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  recentOrders: Order[];
}

export interface ApiError {
  error: string;
  details?: string;
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}
