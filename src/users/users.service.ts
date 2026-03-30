import { Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    private readonly logger = new Logger('UsersService');
    
    async findAProfile(id: number) {
        this.logger.log(`Fetching user id: ${id}`);
        const user = await this.prisma.users.findUnique({ where: { id } });
        if (!user) {
            this.logger.warn(`User ${id} not found`);
            throw new NotFoundException(`User ${id} not found`);
        }
        return { id: user.id, name: user.name, email: user.email, role: user.Role };
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        this.logger.log(`Updating user id: ${id}`);
        const user = await this.prisma.users.update({
            where: { id },
            data: updateUserDto
        });
        if (!user) {
            this.logger.warn(`User ${id} not found`);
            throw new NotFoundException(`User ${id} not found`);
        }
        return { id: user.id, name: user.name, email: user.email, role: user.Role };
    }

}
