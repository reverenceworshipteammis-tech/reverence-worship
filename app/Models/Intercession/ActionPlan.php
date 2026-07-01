<?php

namespace App\Models\Intercession;

use Illuminate\Database\Eloquent\Model;
use App\Models\User\User;

class ActionPlan extends Model
{
    protected $table = 'action_plans';
    
    protected $fillable = [
        'title',
        'start_date',
        'description',
        'due_date',
        'status',
        'user_id',
        'assigned_to',
        'created_by'
    ];
    
    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
    
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function tasks()
    {
        return $this->hasMany(ActionPlanTask::class, 'action_plan_id');
    }
}
