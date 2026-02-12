export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverImage: string;
  bio: string;
  category: string;
  followers: number;
  subscribers: number;
  totalEarnings: string;
  rating: number;
  isVerified: boolean;
  subscriptionPrice: number;
  courses: number;
  posts: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  creatorId: string;
  creator: Creator;
  price: number;
  originalPrice?: number;
  rating: number;
  students: number;
  duration: string;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  isFeatured: boolean;
  isLocked: boolean;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

export const categories: Category[] = [
  { id: "1", name: "Programlama", icon: "code", count: 1250, color: "from-orange-500 to-amber-500" },
  { id: "2", name: "Tasarim", icon: "palette", count: 890, color: "from-pink-500 to-rose-500" },
  { id: "3", name: "Is & Pazarlama", icon: "briefcase", count: 670, color: "from-emerald-500 to-teal-500" },
  { id: "4", name: "Muzik & Ses", icon: "music", count: 450, color: "from-violet-500 to-purple-500" },
  { id: "5", name: "Fotograf", icon: "camera", count: 320, color: "from-cyan-500 to-blue-500" },
  { id: "6", name: "Fitness", icon: "dumbbell", count: 280, color: "from-red-500 to-orange-500" },
  { id: "7", name: "Yemek", icon: "utensils", count: 190, color: "from-yellow-500 to-amber-500" },
  { id: "8", name: "Kisisel Gelisim", icon: "brain", count: 520, color: "from-indigo-500 to-violet-500" },
];

export const creators: Creator[] = [
  {
    id: "1",
    name: "Ayse Yilmaz",
    username: "aysecodes",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=400&fit=crop",
    bio: "Senior Full Stack Developer. React, Node.js ve modern web teknolojileri uzerine 10+ yillik deneyim.",
    category: "Programlama",
    followers: 45200,
    subscribers: 8340,
    totalEarnings: "125K",
    rating: 4.9,
    isVerified: true,
    subscriptionPrice: 29.99,
    courses: 12,
    posts: 156
  },
  {
    id: "2",
    name: "Mehmet Kaya",
    username: "mehmetdesign",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
    bio: "UI/UX Designer @ Google. Figma ve Adobe Creative Suite uzmani. Minimalist tasarim tutkunu.",
    category: "Tasarim",
    followers: 32100,
    subscribers: 5620,
    totalEarnings: "89K",
    rating: 4.8,
    isVerified: true,
    subscriptionPrice: 24.99,
    courses: 8,
    posts: 98
  },
  {
    id: "3",
    name: "Zeynep Demir",
    username: "zeynepfit",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop",
    bio: "Sertifikali Personal Trainer ve Beslenme Uzmani. 50.000+ kisiye saglikli yasam yolculugunda yardim ettim.",
    category: "Fitness",
    followers: 78500,
    subscribers: 12400,
    totalEarnings: "210K",
    rating: 4.95,
    isVerified: true,
    subscriptionPrice: 19.99,
    courses: 15,
    posts: 234
  },
  {
    id: "4",
    name: "Can Ozturk",
    username: "canmusic",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&h=400&fit=crop",
    bio: "Grammy odullu produksiyon uzmani. Logic Pro, Ableton ve muzik teorisi dersleri.",
    category: "Muzik & Ses",
    followers: 29800,
    subscribers: 4100,
    totalEarnings: "67K",
    rating: 4.85,
    isVerified: true,
    subscriptionPrice: 34.99,
    courses: 6,
    posts: 78
  },
  {
    id: "5",
    name: "Elif Sahin",
    username: "elifcooks",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop",
    bio: "Michelin yildizli restoran sefi. Dunya mutfaklarindan lezzetli tarifler ve profesyonel teknikler.",
    category: "Yemek",
    followers: 52300,
    subscribers: 7800,
    totalEarnings: "145K",
    rating: 4.92,
    isVerified: true,
    subscriptionPrice: 14.99,
    courses: 20,
    posts: 312
  },
  {
    id: "6",
    name: "Burak Arslan",
    username: "burakphoto",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=400&fit=crop",
    bio: "National Geographic fotografcisi. Doga ve portre fotografciligi uzerine 15+ yillik deneyim.",
    category: "Fotograf",
    followers: 41200,
    subscribers: 6200,
    totalEarnings: "98K",
    rating: 4.88,
    isVerified: true,
    subscriptionPrice: 27.99,
    courses: 9,
    posts: 145
  },
];

export const courses: Course[] = [
  {
    id: "1",
    title: "React & Next.js ile Modern Web Gelistirme",
    description: "Sifirdan ileri seviyeye React ve Next.js. Gercek projelerle uygulamali egitim.",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    creatorId: "1",
    creator: creators[0],
    price: 89.99,
    originalPrice: 149.99,
    rating: 4.9,
    students: 12450,
    duration: "42 saat",
    lessons: 156,
    level: "Beginner",
    category: "Programlama",
    isFeatured: true,
    isLocked: false,
    tags: ["React", "Next.js", "TypeScript", "Tailwind"]
  },
  {
    id: "2",
    title: "Figma ile UI/UX Tasarim Masterclass",
    description: "Profesyonel arayuz tasarimi. Wireframe'den prototype'a tum surec.",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
    creatorId: "2",
    creator: creators[1],
    price: 79.99,
    originalPrice: 129.99,
    rating: 4.85,
    students: 8920,
    duration: "28 saat",
    lessons: 98,
    level: "Intermediate",
    category: "Tasarim",
    isFeatured: true,
    isLocked: false,
    tags: ["Figma", "UI Design", "UX", "Prototyping"]
  },
  {
    id: "3",
    title: "12 Haftalik Vucut Donusum Programi",
    description: "Evde veya spor salonunda uygulayabileceginiz kapsamli fitness programi.",
    thumbnail: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop",
    creatorId: "3",
    creator: creators[2],
    price: 59.99,
    rating: 4.95,
    students: 23100,
    duration: "36 saat",
    lessons: 84,
    level: "Beginner",
    category: "Fitness",
    isFeatured: true,
    isLocked: false,
    tags: ["Fitness", "Workout", "Nutrition", "Transformation"]
  },
  {
    id: "4",
    title: "Muzik Produksiyonu: Sifirdan Profesyonele",
    description: "Logic Pro ve Ableton ile muzik uretimi. Beat making'den mixing'e.",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=400&fit=crop",
    creatorId: "4",
    creator: creators[3],
    price: 119.99,
    originalPrice: 199.99,
    rating: 4.88,
    students: 5670,
    duration: "52 saat",
    lessons: 134,
    level: "Advanced",
    category: "Muzik & Ses",
    isFeatured: false,
    isLocked: true,
    tags: ["Music Production", "Logic Pro", "Ableton", "Mixing"]
  },
  {
    id: "5",
    title: "Dunya Mutfaklarindan 100 Tarif",
    description: "Italyan, Japon, Meksika ve daha fazla mutfaktan enfes tarifler.",
    thumbnail: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop",
    creatorId: "5",
    creator: creators[4],
    price: 49.99,
    rating: 4.92,
    students: 15800,
    duration: "24 saat",
    lessons: 100,
    level: "Beginner",
    category: "Yemek",
    isFeatured: false,
    isLocked: false,
    tags: ["Cooking", "Recipes", "World Cuisine", "Chef"]
  },
  {
    id: "6",
    title: "Profesyonel Portre Fotografciligi",
    description: "Isik, kompozisyon ve editing teknikleriyle etkileyici portreler.",
    thumbnail: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&h=400&fit=crop",
    creatorId: "6",
    creator: creators[5],
    price: 94.99,
    originalPrice: 159.99,
    rating: 4.86,
    students: 7340,
    duration: "32 saat",
    lessons: 76,
    level: "Intermediate",
    category: "Fotograf",
    isFeatured: true,
    isLocked: false,
    tags: ["Photography", "Portrait", "Lighting", "Editing"]
  },
];

export const stats = {
  totalCreators: "12,500+",
  totalCourses: "45,000+",
  totalStudents: "2.5M+",
  totalEarnings: "$125M+"
};

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
