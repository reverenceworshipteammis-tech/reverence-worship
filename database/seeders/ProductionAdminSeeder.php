<?php

namespace Database\Seeders;

use App\Models\User\Role;
use App\Models\User\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ProductionAdminSeeder extends Seeder
{
    public function run(): void
    {
        $name = env('ADMIN_NAME', 'Super Admin');
        $email = env('ADMIN_EMAIL', 'superadmin@reverence.com');
        $password = env('ADMIN_PASSWORD');

        if (! $password) {
            $this->command?->error('ADMIN_PASSWORD is required.');
            return;
        }

        $role = Role::query()->firstOrCreate(
            ['name' => 'super-admin'],
            [
                'display_name' => 'Super Admin',
                'description' => 'Full system access',
            ]
        );

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        DB::table('role_user')->updateOrInsert(
            [
                'role_id' => $role->id,
                'user_id' => $user->id,
            ],
            [
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->command?->info("Super admin ready: {$email}");
    }
}
