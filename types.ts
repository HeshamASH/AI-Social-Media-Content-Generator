export enum RoomType {
  LivingRoom = 'Living Room',
  Bedroom = 'Bedroom',
  Kitchen = 'Kitchen',
  Office = 'Home Office',
  Bathroom = 'Bathroom',
}

export enum DecorStyle {
  Modern = 'Modern',
  Scandinavian = 'Scandinavian',
  Bohemian = 'Bohemian',
  Industrial = 'Industrial',
  Minimalist = 'Minimalist',
}

export interface GeneratedDesign {
  rationale: string;
  image: string | null;
}

export interface InspirationTemplate {
  name: string;
  description: string;
  roomType: RoomType;
  decorStyle: DecorStyle;
}

export interface Comment {
  id: number;
  x: number; // percentage
  y: number; // percentage
  text: string;
}

export type EditPayload =
  | { type: 'simple'; prompt: string }
  | { type: 'advanced'; overlayDataUrl: string; comments: Comment[] };
