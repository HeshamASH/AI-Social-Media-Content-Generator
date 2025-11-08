import { RoomType, DecorStyle, InspirationTemplate } from './types';

export const ROOM_TYPES: RoomType[] = [
  RoomType.LivingRoom,
  RoomType.Bedroom,
  RoomType.Kitchen,
  RoomType.Office,
  RoomType.Bathroom,
];

export const DECOR_STYLES: DecorStyle[] = [
  DecorStyle.Modern,
  DecorStyle.Scandinavian,
  DecorStyle.Bohemian,
  DecorStyle.Industrial,
  DecorStyle.Minimalist,
];

export const INSPIRATION_TEMPLATES: InspirationTemplate[] = [
  {
    name: 'Cozy Reading Nook',
    description: 'A cozy corner in a living room with a comfortable armchair, a warm throw blanket, a small side table for a cup of tea, and a floor lamp providing soft, warm light. Bookshelves are filled with books in the background.',
    roomType: RoomType.LivingRoom,
    decorStyle: DecorStyle.Scandinavian,
  },
  {
    name: 'Sleek & Productive Office',
    description: 'A minimalist home office with a large wooden desk, an ergonomic chair, a sleek monitor, and a large window that lets in plenty of natural light. The color palette is neutral with black accents.',
    roomType: RoomType.Office,
    decorStyle: DecorStyle.Minimalist,
  },
  {
    name: 'Bohemian Dream Bedroom',
    description: 'A bedroom with a low-profile bed, macrame wall hangings, many potted plants (like snake plants and ferns), and layered textiles with different patterns and textures. The overall vibe is relaxed and eclectic.',
    roomType: RoomType.Bedroom,
    decorStyle: DecorStyle.Bohemian,
  },
  {
    name: 'Industrial-Style Kitchen',
    description: 'A kitchen with exposed brick walls, open shelving with metal pipes, concrete countertops, and stainless steel appliances. Pendant lights with Edison bulbs hang over a central island.',
    roomType: RoomType.Kitchen,
    decorStyle: DecorStyle.Industrial,
  },
];