export class User {
  id: number;
  email: string;
  passwordHash: string;
  roles: Role; 
}

export enum Role {
  Admin = 'ADMIN',
  User = 'USER',
}