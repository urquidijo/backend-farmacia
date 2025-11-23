// src/usuarios/usuarios.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';

// ---- Mock de bcrypt ----
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// ---- Mock de PrismaService ----
const prismaMock = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  userRole: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService;

describe('UsersService (caja blanca)', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ----------------------------------------------------
  // create
  // ----------------------------------------------------
  it('create: debería crear usuario con hash de password y rol cuando roleId viene definido', async () => {
    const dto: any = {
      email: 'nuevo@test.com',
      password: '123456',
      firstName: 'Nuevo',
      lastName: 'User',
      telefono: '77777777',
      roleId: 1,
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-mock');

    const createdUser = {
      id: 1,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      telefono: dto.telefono,
    };

    (prismaMock.user.create as jest.Mock).mockResolvedValue(createdUser);

    const result = await service.create(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telefono: dto.telefono,
        passwordHash: 'hash-mock',
        roles: { create: [{ roleId: dto.roleId }] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
      },
    });
    expect(result).toEqual(createdUser);
  });

  it('create: debería crear usuario SIN roles cuando roleId no viene', async () => {
    const dto: any = {
      email: 'sinrol@test.com',
      password: '123456',
      firstName: 'Sin',
      lastName: 'Rol',
      telefono: '70000000',
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-mock-2');

    const createdUser = {
      id: 2,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      telefono: dto.telefono,
    };

    (prismaMock.user.create as jest.Mock).mockResolvedValue(createdUser);

    const result = await service.create(dto);

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telefono: dto.telefono,
        passwordHash: 'hash-mock-2',
        roles: undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
      },
    });
    expect(result).toEqual(createdUser);
  });

  // ----------------------------------------------------
  // findAll
  // ----------------------------------------------------
  it('findAll: debería mapear usuarios y tomar el primer rol', async () => {
    const fakeUsers = [
      {
        id: 1,
        email: 'u1@test.com',
        firstName: 'U1',
        lastName: 'Test',
        telefono: '111',
        status: 'ACTIVE',
        roles: [
          { role: { id: 10, name: 'ADMIN' } },
          { role: { id: 11, name: 'OTRO' } },
        ],
      },
      {
        id: 2,
        email: 'u2@test.com',
        firstName: 'U2',
        lastName: 'Test',
        telefono: '222',
        status: 'INACTIVE',
        roles: [],
      },
    ];

    (prismaMock.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);

    const result = await service.findAll();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        roles: { include: { role: true } },
      },
      orderBy: { id: 'asc' },
    });

    expect(result).toEqual([
      {
        id: 1,
        email: 'u1@test.com',
        firstName: 'U1',
        lastName: 'Test',
        telefono: '111',
        status: 'ACTIVE',
        role: { id: 10, name: 'ADMIN' },
      },
      {
        id: 2,
        email: 'u2@test.com',
        firstName: 'U2',
        lastName: 'Test',
        telefono: '222',
        status: 'INACTIVE',
        role: null,
      },
    ]);
  });

  // ----------------------------------------------------
  // update
  // ----------------------------------------------------
  it('update: debería lanzar NotFoundException si el usuario no existe', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

    const dto: any = { firstName: 'NuevoNombre' };

    await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  it('update: debería actualizar datos básicos y cambiar rol dentro de una transacción', async () => {
    const existingUser = {
      id: 1,
      email: 'u1@test.com',
      firstName: 'Viejo',
      lastName: 'Nombre',
      telefono: '111',
      status: 'ACTIVE',
      passwordHash: 'hash',
    };

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(existingUser);

    const dto: any = {
      firstName: 'Nuevo',
      telefono: '999',
      roleId: 3,
    };

    // Mock de la transacción
    const txUserUpdate = jest.fn().mockResolvedValue({ id: 1 });
    const txUserRoleDeleteMany = jest.fn().mockResolvedValue(undefined);
    const txUserRoleCreate = jest.fn().mockResolvedValue(undefined);

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: any) => any) => {
        const tx = {
          user: {
            update: txUserUpdate,
          },
          userRole: {
            deleteMany: txUserRoleDeleteMany,
            create: txUserRoleCreate,
          },
        };
        return cb(tx);
      },
    );

    const finalUser = {
      id: 1,
      email: 'u1@test.com',
      firstName: 'Nuevo',
      lastName: 'Nombre',
      telefono: '999',
      status: 'ACTIVE',
      roles: [{ role: { id: 3, name: 'NUEVO_ROL' } }],
    };

    // segundo findUnique (el que se hace al final del update)
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(finalUser);

    const result = await service.update(1, dto);

    // findUnique inicial
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    // data que se manda al update
    expect(txUserUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        firstName: 'Nuevo',
        telefono: '999',
      },
      select: { id: true },
    });

    // manejo de rol
    expect(txUserRoleDeleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(txUserRoleCreate).toHaveBeenCalledWith({
      data: { userId: 1, roleId: 3 },
    });

    // findUnique final con select completo
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        roles: { include: { role: true } },
      },
    });

    expect(result).toEqual(finalUser);
  });

  it('update: debería hashear password si viene en el DTO', async () => {
    const existingUser = {
      id: 1,
      email: 'u1@test.com',
      firstName: 'Viejo',
      lastName: 'Nombre',
      telefono: '111',
      status: 'ACTIVE',
      passwordHash: 'hash',
    };

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(existingUser);

    const dto: any = {
      password: 'nueva-clave',
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-nuevo');

    const txUserUpdate = jest.fn().mockResolvedValue({ id: 1 });

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: any) => any) => {
        const tx = {
          user: {
            update: txUserUpdate,
          },
          userRole: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        };
        return cb(tx);
      },
    );

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...existingUser,
      passwordHash: 'hash-nuevo',
    });

    await service.update(1, dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('nueva-clave', 10);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hash-nuevo',
        }),
      }),
    );
  });

  // ----------------------------------------------------
  // remove
  // ----------------------------------------------------
  it('remove: debería eliminar relaciones de rol y luego el usuario', async () => {
    const deletedUser = { id: 1, email: 'u1@test.com' };

    (prismaMock.user.delete as jest.Mock).mockResolvedValue(deletedUser);

    const result = await service.remove(1);

    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(result).toEqual(deletedUser);
  });

  // ----------------------------------------------------
  // findClientes
  // ----------------------------------------------------
  it('findClientes: debería filtrar por rol CLIENTE y mapear salida', async () => {
    const fakeUsers = [
      {
        id: 1,
        email: 'cliente1@test.com',
        firstName: 'Cli',
        lastName: 'Uno',
        telefono: '111',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-11'),
        roles: [{ role: { id: 5, name: 'CLIENTE' } }],
      },
    ];

    (prismaMock.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);

    const result = await service.findClientes();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        roles: {
          some: {
            role: {
              name: 'CLIENTE',
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toEqual([
      {
        id: 1,
        email: 'cliente1@test.com',
        firstName: 'Cli',
        lastName: 'Uno',
        telefono: '111',
        status: 'ACTIVE',
        createdAt: fakeUsers[0].createdAt,
        updatedAt: fakeUsers[0].updatedAt,
        role: { id: 5, name: 'CLIENTE' },
      },
    ]);
  });

  // ----------------------------------------------------
  // findClientesByDateRange
  // ----------------------------------------------------
  it('findClientesByDateRange: debería convertir fechas y devolver estructura con total y clientes', async () => {
    const dto: any = {
      fechaInicial: '2024-01-01',
      fechaFinal: '2024-01-31',
    };

    const fakeUsers = [
      {
        id: 1,
        email: 'cliente1@test.com',
        firstName: 'Cli',
        lastName: 'Uno',
        telefono: '111',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-11'),
        roles: [{ role: { id: 5, name: 'CLIENTE' } }],
      },
      {
        id: 2,
        email: 'cliente2@test.com',
        firstName: 'Cli',
        lastName: 'Dos',
        telefono: '222',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-21'),
        roles: [{ role: { id: 5, name: 'CLIENTE' } }],
      },
    ];

    (prismaMock.user.findMany as jest.Mock).mockResolvedValue(fakeUsers);

    const result = await service.findClientesByDateRange(dto);

    const expectedStart = new Date('2024-01-01');
    const expectedEnd = new Date('2024-01-31');
    expectedEnd.setHours(23, 59, 59, 999);

    // Verificamos que se llamó con el rango correcto
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        roles: {
          some: {
            role: {
              name: 'CLIENTE',
            },
          },
        },
        createdAt: {
          gte: expectedStart,
          lte: expectedEnd,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(result.total).toBe(2);
    expect(result.clientes.length).toBe(2);
    expect(result.fechaInicial).toEqual(expectedStart);
    expect(result.fechaFinal).toEqual(expectedEnd);
    expect(result.clientes[0]).toHaveProperty('role');
  });
});
