import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/users.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('myProfile')
    @ApiOperation({ summary: 'Get the profile of the logged-in user' })
    @ApiResponse({ 
        status: 200, 
        description: 'User profile retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMyProfile(@GetUser() user: any) {
        return this.usersService.findAProfile(user.id); // ID comes from token, not URL
    }

    @UseGuards(JwtAuthGuard)
    @Patch('myProfile')
    @ApiOperation({ summary: 'Update the profile of the logged-in user' })
    @ApiResponse({ 
        status: 200, 
        description: 'User profile updated successfully' ,
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async update(@GetUser() user: any, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(user.id, updateUserDto);
    }

}
