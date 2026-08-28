import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ACTIVE_MEMBERSHIP_POLICY,
  TypeOrmActiveMembershipPolicy,
} from './active-membership-policy';
import { Membership } from './membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  providers: [
    TypeOrmActiveMembershipPolicy,
    {
      provide: ACTIVE_MEMBERSHIP_POLICY,
      useExisting: TypeOrmActiveMembershipPolicy,
    },
  ],
  exports: [ACTIVE_MEMBERSHIP_POLICY],
})
export class MembershipAuthorizationModule {}
