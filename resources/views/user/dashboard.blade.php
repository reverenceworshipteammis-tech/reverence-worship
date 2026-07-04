@extends('layouts.app')

@section('title', 'Dashboard')
@section('page-title', 'Dashboard')

@section('content')
<div class="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-5">
    <section class="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 sm:p-7 text-white shadow-sm mb-5">
        <div class="relative z-10">
            <p class="text-sm text-blue-100">{{ now()->format('l, F j, Y') }}</p>
            <h1 class="text-2xl sm:text-3xl font-bold mt-1">Welcome, {{ Auth::user()->name }}</h1>
            <p class="text-sm text-blue-100 mt-2">
                @if($pendingForms->isNotEmpty())
                    You have {{ $pendingForms->count() }} {{ Str::plural('form', $pendingForms->count()) }} waiting for you.
                @else
                    You are all caught up. There are no forms waiting for you.
                @endif
            </p>
        </div>
        <i class="fas fa-sparkles absolute -right-4 -bottom-6 text-8xl text-white/10"></i>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <a href="{{ route('user.performance.show', 'discipline') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[190px] hover:border-emerald-300 hover:shadow-md transition">
            <h2 class="font-bold text-gray-900">Discipline Performance</h2>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#10b981 {{ $performance['discipline']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-gray-900">
                        {{ $performance['discipline']['rate'] }}%
                    </div>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-600">Good Behavior Rate</p>
                    <p class="text-sm text-gray-900 mt-1">{{ $performance['discipline']['good'] }} good / {{ $performance['discipline']['total'] }} total records</p>
                    <p class="text-xs text-gray-500 mt-1">Year {{ $performance['discipline']['year'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'attendance') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[190px] hover:border-emerald-300 hover:shadow-md transition">
            <h2 class="font-bold text-gray-900">Attendance Performance</h2>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#10b981 {{ $performance['attendance']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-gray-900">
                        {{ $performance['attendance']['rate'] }}%
                    </div>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-600">Attendance Rate</p>
                    <p class="text-sm text-gray-900 mt-1">{{ $performance['attendance']['present'] }} attended / {{ $performance['attendance']['total'] }} sessions</p>
                    <p class="text-xs text-gray-500 mt-1">{{ $performance['attendance']['period'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'communication') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[190px] hover:border-blue-300 hover:shadow-md transition">
            <h2 class="font-bold text-gray-900">Communication Performance</h2>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#3b82f6 {{ $performance['communication']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-gray-900">
                        {{ $performance['communication']['rate'] }}%
                    </div>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-600">Communication Rate</p>
                    <p class="text-sm text-gray-900 mt-1">{{ $performance['communication']['communicated'] }} communicated / {{ $performance['communication']['total'] }} sessions</p>
                    <p class="text-xs text-gray-500 mt-1">{{ $performance['communication']['period'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'contribution') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[190px] hover:border-orange-300 hover:shadow-md transition">
            <h2 class="font-bold text-gray-900">Contribution Progress</h2>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#f97316 {{ $performance['contribution']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-gray-900">
                        {{ $performance['contribution']['rate'] }}%
                    </div>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-600">Contribution Rate</p>
                    <p class="text-sm text-gray-900 mt-1">RWF {{ number_format($performance['contribution']['paid']) }} / RWF {{ number_format($performance['contribution']['expected']) }}</p>
                    <p class="text-xs text-gray-500 mt-1">Year {{ $performance['contribution']['year'] }}</p>
                </div>
            </div>
        </a>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)] gap-5">
        <div class="space-y-5 min-w-0">
            <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-200">
                    <div>
                        <h2 class="font-bold text-gray-900">Forms to complete</h2>
                        <p class="text-xs text-gray-500 mt-0.5">Open a form and submit your response.</p>
                    </div>
                    @if($pendingForms->isNotEmpty())
                        <span class="text-xs font-bold text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">{{ $pendingForms->count() }} pending</span>
                    @endif
                </div>

                @if($pendingForms->isNotEmpty())
                    <div class="divide-y divide-gray-100">
                        @foreach($pendingForms as $form)
                            <a href="{{ route('forms.take', $form->id) }}" class="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-blue-50/50 transition group">
                                <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <i class="fas {{ $form->is_quiz ? 'fa-clipboard-question' : 'fa-file-lines' }}"></i>
                                </span>
                                <span class="min-w-0 flex-1">
                                    <span class="font-semibold text-sm text-gray-900 block truncate">{{ $form->title }}</span>
                                    <span class="text-xs text-gray-500 block mt-0.5">
                                        {{ $form->question_count }} {{ Str::plural('question', $form->question_count) }}
                                        @if($form->time_limit)
                                            · {{ $form->time_limit }} minutes
                                        @endif
                                    </span>
                                </span>
                                <span class="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
                                    Start <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </span>
                            </a>
                        @endforeach
                    </div>
                @else
                    <div class="px-5 py-10 text-center">
                        <span class="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <i class="fas fa-check"></i>
                        </span>
                        <p class="font-semibold text-gray-800 mt-3">No pending forms</p>
                        <p class="text-xs text-gray-500 mt-1">New published forms will appear here automatically.</p>
                    </div>
                @endif
            </section>

            @if($familyTasks->isNotEmpty())
                <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-200">
                        <div>
                            <h2 class="font-bold text-gray-900">Family tasks</h2>
                            <p class="text-xs text-gray-500 mt-0.5">Upcoming work for your family.</p>
                        </div>
                        <a href="{{ route('family.index') }}" class="text-xs font-semibold text-blue-600 hover:text-blue-700">View family</a>
                    </div>
                    <div class="divide-y divide-gray-100">
                        @foreach($familyTasks as $task)
                            @php
                                $overdue = $task->due_date && \Carbon\Carbon::parse($task->due_date)->isPast();
                            @endphp
                            <div class="flex items-center gap-3 px-4 sm:px-5 py-3">
                                <span class="w-8 h-8 rounded-lg {{ $overdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600' }} flex items-center justify-center shrink-0">
                                    <i class="fas fa-list-check text-sm"></i>
                                </span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-medium text-gray-800 truncate">{{ $task->title }}</p>
                                    <p class="text-xs {{ $overdue ? 'text-red-600' : 'text-gray-500' }}">
                                        {{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('d M Y') : 'No due date' }}
                                        @if($overdue) · Overdue @endif
                                    </p>
                                </div>
                                <span class="text-[11px] font-semibold rounded-full px-2 py-1 {{ $task->status === 'in-progress' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700' }}">
                                    {{ $task->status === 'in-progress' ? 'In progress' : 'Pending' }}
                                </span>
                            </div>
                        @endforeach
                    </div>
                </section>
            @endif

        </div>

        <aside class="space-y-5 min-w-0">
            <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                    <h2 class="font-bold text-gray-900">Announcements</h2>
                    <i class="fas fa-bullhorn text-orange-500"></i>
                </div>
                <div class="divide-y divide-gray-100">
                    @forelse(($stats['recent_announcements'] ?? collect()) as $announcement)
                        <a href="{{ route('announcements.index') }}" class="block p-4 hover:bg-gray-50 transition">
                            <div class="flex items-start gap-2">
                                @if(($announcement->priority ?? '') === 'high')
                                    <span class="mt-1 w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
                                @endif
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-gray-800">{{ $announcement->title }}</p>
                                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ strip_tags($announcement->content ?? '') }}</p>
                                    <p class="text-[11px] text-gray-400 mt-2">
                                        {{ \Carbon\Carbon::parse($announcement->published_at ?? $announcement->created_at)->diffForHumans() }}
                                    </p>
                                </div>
                            </div>
                        </a>
                    @empty
                        <div class="p-8 text-center text-sm text-gray-400">No announcements available.</div>
                    @endforelse
                </div>
            </section>

            <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-4 py-4 border-b border-gray-200">
                    <h2 class="font-bold text-gray-900">Your recent activity</h2>
                </div>
                <div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    @forelse($recentActivities as $activity)
                        <div class="p-4 flex items-center gap-3">
                            <span class="w-8 h-8 rounded-full {{ $activity->icon_bg ?? 'bg-gray-100' }} flex items-center justify-center shrink-0">
                                <i class="{{ $activity->icon ?? 'fas fa-bell' }} {{ $activity->icon_color ?? 'text-gray-500' }} text-xs"></i>
                            </span>
                            <div class="min-w-0">
                                <p class="text-xs text-gray-800">{{ $activity->description }}</p>
                                <p class="text-[11px] text-gray-400 mt-0.5">{{ \Carbon\Carbon::parse($activity->created_at)->diffForHumans() }}</p>
                            </div>
                        </div>
                    @empty
                        <div class="p-8 text-center text-sm text-gray-400">No recent activity yet.</div>
                    @endforelse
                </div>
            </section>
        </aside>
    </div>
</div>
@endsection
