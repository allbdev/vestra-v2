import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { EmailModule } from "./email/email.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { InvitesModule } from "./invites/invites.module";
import { CategoriesModule } from "./categories/categories.module";
import { TransactionTemplatesModule } from "./transaction-templates/transaction-templates.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PlansModule } from "./plans/plans.module";
import { ContactModule } from "./contact/contact.module";
import { CronModule } from "./cron/cron.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    InvitesModule,
    CategoriesModule,
    TransactionTemplatesModule,
    TransactionsModule,
    DashboardModule,
    OnboardingModule,
    PlansModule,
    ContactModule,
    NotificationsModule,
    CronModule,
    HealthModule,
  ],
})
export class AppModule {}
