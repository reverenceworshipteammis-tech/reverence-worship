<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\User\Role;
use App\Models\System\Page;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    protected ?array $roleNamesCache = null;
    protected ?array $roleIdsCache = null;
    protected ?bool $isSuperAdminCache = null;
    protected ?bool $isParentCache = null;
    protected ?bool $hasFamilyCache = null;
    protected $accessiblePagesCache = null;
    protected array $accessCache = [];
    protected array $permissionCache = [];
    protected ?array $permissionMatrixCache = null;
    protected static array $tableExistsCache = [];
    
    protected $fillable = [
        'name', 'email', 'password', 'is_active', 'created_by',
        'phone', 'date_of_birth', 'province', 'district', 'sector', 'village',
        'gender', 'marital_status', 'membership_type', 'occupation', 'ministry_role',
        'emergency_contact', 'emergency_name', 'skills', 'notes',
        'is_singer', 'voice_part', 'singer_level', 'singer_notes', 'google_id', 'avatar',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'date_of_birth' => 'date',
        'is_singer' => 'boolean',
    ];

    public function isPending()
    {
        return !$this->is_active && $this->email_verified_at === null;
    }

    public function getStatusAttribute()
    {
        if ($this->is_active) {
            return 'active';
        }
        return 'pending';
    }
    
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user', 'user_id', 'role_id');
    }

    public static function refreshPermissionCache(): void
    {
        Cache::forever('permission_cache_version', now()->timestamp);
    }

    private function permissionCacheVersion(): int
    {
        return (int) Cache::get('permission_cache_version', 1);
    }

    public function hasRole($roleName)
    {
        try {
            if ($this->roleNamesCache === null) {
                $this->roleNamesCache = Cache::remember(
                    "user:{$this->id}:role_names:v{$this->permissionCacheVersion()}",
                    now()->addMinutes(10),
                    fn () => DB::table('roles')
                        ->join('role_user', 'roles.id', '=', 'role_user.role_id')
                        ->where('role_user.user_id', $this->id)
                        ->pluck('roles.name')
                        ->toArray()
                );
            }

            return in_array($roleName, $this->roleNamesCache, true);
        } catch (\Exception $e) {
            Log::error('hasRole error: ' . $e->getMessage());
            return false;
        }
    }

    public function getRoleIds()
    {
        try {
            if ($this->roleIdsCache === null) {
                $this->roleIdsCache = Cache::remember(
                    "user:{$this->id}:role_ids:v{$this->permissionCacheVersion()}",
                    now()->addMinutes(10),
                    fn () => DB::table('role_user')
                        ->where('user_id', $this->id)
                        ->pluck('role_id')
                        ->toArray()
                );
            }

            return $this->roleIdsCache;
        } catch (\Exception $e) {
            Log::error('getRoleIds error: ' . $e->getMessage());
            return [];
        }
    }

    public function isSuperAdmin()
    {
        if ($this->isSuperAdminCache === null) {
            $this->isSuperAdminCache = $this->hasRole('super-admin');
        }

        return $this->isSuperAdminCache;
    }

    public function isParent()
    {
        if ($this->isParentCache === null) {
            $this->isParentCache = Cache::remember(
                "user:{$this->id}:is_parent",
                now()->addMinutes(2),
                fn () => DB::table('family_members')
                    ->where('user_id', $this->id)
                    ->where('role', 'parent')
                    ->exists()
                    || DB::table('families')
                        ->where('parent_id', $this->id)
                        ->exists()
            );
        }

        return $this->isParentCache;
    }

    public function hasFamily()
    {
        if ($this->hasFamilyCache === null) {
            $this->hasFamilyCache = Cache::remember(
                "user:{$this->id}:has_family",
                now()->addMinutes(2),
                fn () => DB::table('family_members')
                    ->where('user_id', $this->id)
                    ->exists()
            );
        }

        return $this->hasFamilyCache;
    }

    private function tableExists(string $tableName): bool
    {
        if (!array_key_exists($tableName, self::$tableExistsCache)) {
            try {
                $table = str_replace("'", "''", $tableName);
                $result = DB::select("SELECT to_regclass('{$table}')");
                self::$tableExistsCache[$tableName] = ($result[0]->to_regclass ?? null) !== null;
            } catch (\Exception $e) {
                self::$tableExistsCache[$tableName] = false;
            }
        }

        return self::$tableExistsCache[$tableName];
    }

    private function permissionMatrix(): array
    {
        if ($this->permissionMatrixCache !== null) {
            return $this->permissionMatrixCache;
        }

        $roleIds = $this->getRoleIds();

        if (empty($roleIds) || !$this->tableExists('role_page_features')) {
            return $this->permissionMatrixCache = [
                'pages' => [],
                'features' => [],
                'page_ids' => [],
            ];
        }

        return $this->permissionMatrixCache = Cache::remember(
            "user:{$this->id}:permission_matrix:v{$this->permissionCacheVersion()}",
            now()->addMinutes(10),
            function () use ($roleIds) {
                $rows = DB::table('role_page_features')
                    ->join('pages', 'role_page_features.page_id', '=', 'pages.id')
                    ->join('features', 'role_page_features.feature_id', '=', 'features.id')
                    ->whereIn('role_page_features.role_id', $roleIds)
                    ->where('pages.is_active', true)
                    ->get([
                        'role_page_features.page_id',
                        'pages.name as page_name',
                        'features.name as feature_name',
                    ]);

                $matrix = [
                    'pages' => [],
                    'features' => [],
                    'page_ids' => [],
                ];

                foreach ($rows as $row) {
                    $pageName = (string) $row->page_name;
                    $featureName = (string) $row->feature_name;

                    $matrix['pages'][$pageName]['any'] = true;
                    $matrix['pages'][$pageName]['features'][$featureName] = true;
                    $matrix['features'][$featureName] = true;
                    $matrix['page_ids'][(int) $row->page_id] = (int) $row->page_id;
                }

                return $matrix;
            }
        );
    }

   public function getAccessiblePages()
{
    if ($this->accessiblePagesCache !== null) {
        return $this->accessiblePagesCache;
    }

    // Super admin can see all active pages
    if ($this->isSuperAdmin()) {
        return $this->accessiblePagesCache = Page::where('is_active', true)->orderBy('sort_order')->get();
    }
    
    $matrix = $this->permissionMatrix();
    $pageIds = array_values($matrix['page_ids']);

    if (empty($pageIds)) {
        return $this->accessiblePagesCache = collect();
    }
    
    try {
        return $this->accessiblePagesCache = Page::whereIn('id', $pageIds)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    } catch (\Exception $e) {
        Log::error('getAccessiblePages error: ' . $e->getMessage());
        return $this->accessiblePagesCache = collect();
    }
}

   public function canAccess($pageName, $featureName)
{
    $cacheKey = $pageName . ':' . $featureName;

    if (array_key_exists($cacheKey, $this->accessCache)) {
        return $this->accessCache[$cacheKey];
    }

    // Super admin has all access
    if ($this->isSuperAdmin()) {
        return $this->accessCache[$cacheKey] = true;
    }
    
    try {
        $matrix = $this->permissionMatrix();

        // If checking for 'view', also return true if user has any permission on this page
        if ($featureName === 'view') {
            return $this->accessCache[$cacheKey] = (bool) ($matrix['pages'][$pageName]['any'] ?? false);
        }
        
        return $this->accessCache[$cacheKey] = (bool) ($matrix['pages'][$pageName]['features'][$featureName] ?? false);
    } catch (\Exception $e) {
        Log::error('canAccess error: ' . $e->getMessage());
        return $this->accessCache[$cacheKey] = false;
    }
}

    /**
     * Check if user has a specific permission
     */
    public function hasPermission($permissionName)
    {
        if (array_key_exists($permissionName, $this->permissionCache)) {
            return $this->permissionCache[$permissionName];
        }

        if ($this->isSuperAdmin()) {
            return $this->permissionCache[$permissionName] = true;
        }
        
        try {
            $matrix = $this->permissionMatrix();
            return $this->permissionCache[$permissionName] = (bool) ($matrix['features'][$permissionName] ?? false);
        } catch (\Exception $e) {
            Log::error('hasPermission error: ' . $e->getMessage());
            return $this->permissionCache[$permissionName] = false;
        }
    }

    /**
     * Alias for hasPermission
     */
    public function hasPermissionTo($permissionName)
    {
        return $this->hasPermission($permissionName);
    }

    public function isSinger()
    {
        return $this->is_singer == true;
    }
    /**
 * Check if user has any permission on a page
 */
public function canAccessAny($pageName)
{
    if ($this->isSuperAdmin()) {
        return true;
    }

    $cacheKey = $pageName . ':*';
    if (array_key_exists($cacheKey, $this->accessCache)) {
        return $this->accessCache[$cacheKey];
    }
    
    try {
        $matrix = $this->permissionMatrix();
        return $this->accessCache[$cacheKey] = (bool) ($matrix['pages'][$pageName]['any'] ?? false);
    } catch (\Exception $e) {
        return $this->accessCache[$cacheKey] = false;
    }
}

/**
 * Check if user can export data
 */
public function canExport($pageName)
{
    return $this->canAccess($pageName, 'export') || $this->canAccess($pageName, 'view');
}
}
