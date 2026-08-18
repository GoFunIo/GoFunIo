import './helpers/test-env';
import { DataSource } from 'typeorm';
import { UserProfileStore } from '../src/users/user-profile.store';
import { User } from '../src/users/users.entity';

describe('UserProfileStore (integration)', () => {
  let dataSource: DataSource;
  let store: UserProfileStore;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA,
      entities: [User],
      synchronize: false,
      extra: {
        options: `-c search_path=${process.env.DATABASE_SCHEMA},public`,
      },
    });
    await dataSource.initialize();
    store = new UserProfileStore(dataSource.getRepository(User));
  });

  afterAll(async () => dataSource?.destroy());

  it('reads and updates only the account profile without selecting the hash', async () => {
    const repository = dataSource.getRepository(User);
    const user = await repository.save(
      repository.create({
        email: `profile-store-${Date.now()}@example.com`,
        password: 'secret.hash',
        firstName: 'Before',
      }),
    );

    await expect(store.get(user.id)).resolves.toMatchObject({
      id: user.id,
      email: user.email,
      hasPassword: true,
    });
    await expect(
      store.update(user.id, {
        firstName: null,
        city: 'Warszawa',
        email: 'attacker@example.com',
      } as never),
    ).resolves.toMatchObject({ firstName: null, city: 'Warszawa' });

    const persisted = await repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: user.id })
      .getOneOrFail();
    expect(persisted.email).toBe(user.email);
    expect(persisted.password).toBe('secret.hash');
  });

  it('preserves concurrent changes to different profile fields', async () => {
    const repository = dataSource.getRepository(User);
    const user = await repository.save(
      repository.create({ email: `profile-race-${Date.now()}@example.com` }),
    );

    await Promise.all([
      store.update(user.id, { firstName: 'Jan' }),
      store.update(user.id, { city: 'Warszawa' }),
    ]);

    await expect(store.get(user.id)).resolves.toMatchObject({
      firstName: 'Jan',
      city: 'Warszawa',
    });
  });
});
