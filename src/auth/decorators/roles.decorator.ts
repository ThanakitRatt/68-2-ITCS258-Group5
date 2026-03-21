/*
AI Declaration:
I used Gemini to help debug when token given from postman gives the incorrect role.
I wrote all the other code, and I understand the entire implementation.

Reflection:
I understand how to create a role decorator in NestJS, and how to use them with guards to implement role-based access control.
In this implementation, I created a Roles decorator and a RolesGuard to check if the user has the required role to access certain endpoints.
*/
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);