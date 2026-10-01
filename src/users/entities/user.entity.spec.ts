import { instanceToPlain } from 'class-transformer';
import { UserEntity } from './user.entity';

describe('UserEntity serialization', () => {
  const buildUser = (): UserEntity => {
    const user = new UserEntity();
    user.userId = 1;
    user.firstName = 'Test';
    user.lastName = 'User';
    user.email = 'test.user@example.com';
    user.password = 'fake-password-hash';
    user.gmailAccessToken = 'fake-access-token';
    user.gmailRefreshToken = 'fake-refresh-token';
    user.gmailEmail = 'test.user@gmail.example.com';
    user.googleId = 'fake-google-id';
    return user;
  };

  it.each(['password', 'gmailAccessToken', 'gmailRefreshToken', 'googleId'])(
    'does not expose %s when serialized',
    (field) => {
      expect(instanceToPlain(buildUser())).not.toHaveProperty(field);
    },
  );

  it.each(['userId', 'email', 'firstName', 'lastName', 'gmailEmail'])('still exposes %s when serialized', (field) => {
    expect(instanceToPlain(buildUser())).toHaveProperty(field);
  });
});
