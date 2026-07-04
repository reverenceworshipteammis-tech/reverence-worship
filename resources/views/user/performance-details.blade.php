@extends('layouts.app')

@php
    $titles = [
        'discipline' => 'Discipline Performance',
        'attendance' => 'Attendance Performance',
        'communication' => 'Communication Performance',
        'contribution' => 'Contribution Progress',
    ];
    $title = $titles[$type] ?? 'Performance Details';
    $metric = $performance[$type];
@endphp

@section('title', $title)
@section('page-title', $title)

@section('content')
<div class="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
            <a href="{{ route('user.dashboard') }}" class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2">
                <i class="fas fa-arrow-left"></i> Back to dashboard
            </a>
            <h1 class="text-xl font-bold text-gray-900">{{ $title }}</h1>
            <p class="text-sm text-gray-500">Your personal records for {{ $year }}.</p>
        </div>
        <div class="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <span class="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold">{{ $metric['rate'] }}%</span>
            <div>
                <p class="text-xs text-gray-500">Current rate</p>
                <p class="font-bold text-gray-900">{{ $metric['rate'] }}%</p>
            </div>
        </div>
    </div>

    @if($type === 'contribution')
        @php
            $balance = max(0, $metric['expected'] - $metric['paid']);
        @endphp
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <p class="text-xs text-gray-500">Expected</p>
                <p class="text-lg font-bold text-gray-900 mt-1">RWF {{ number_format($metric['expected']) }}</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <p class="text-xs text-gray-500">Paid</p>
                <p class="text-lg font-bold text-emerald-600 mt-1">RWF {{ number_format($metric['paid']) }}</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl p-4">
                <p class="text-xs text-gray-500">Remaining</p>
                <p class="text-lg font-bold text-orange-600 mt-1">RWF {{ number_format($balance) }}</p>
            </div>
        </div>
    @endif

    <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 sm:px-5 py-4 border-b border-gray-200">
            <h2 class="font-bold text-gray-900">
                {{ $type === 'contribution' ? 'Payment history' : 'Detailed records' }}
            </h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ $records->count() }} {{ Str::plural('record', $records->count()) }}</p>
        </div>

        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                @if($type === 'discipline')
                    <thead class="bg-gray-50">
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Record</th>
                            <th class="px-4 py-3">Type</th>
                            <th class="px-4 py-3">Points</th>
                            <th class="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse($records as $record)
                            <tr class="text-sm">
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ \Carbon\Carbon::parse($record->created_at)->format('d M Y') }}</td>
                                <td class="px-4 py-3">
                                    <p class="font-medium text-gray-900">{{ $record->title }}</p>
                                    @if($record->description)<p class="text-xs text-gray-500 mt-1">{{ $record->description }}</p>@endif
                                </td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 rounded-full text-xs {{ $record->type === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700' }}">{{ ucfirst($record->type) }}</span>
                                </td>
                                <td class="px-4 py-3 text-gray-700">{{ $record->points ?? 0 }}</td>
                                <td class="px-4 py-3 text-gray-700">{{ ucfirst($record->status ?? 'open') }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="px-4 py-12 text-center text-gray-400">No discipline records for {{ $year }}.</td></tr>
                        @endforelse
                    </tbody>
                @elseif($type === 'attendance')
                    <thead class="bg-gray-50">
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Session</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">On time</th>
                            <th class="px-4 py-3">Late minutes</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse($records as $record)
                            <tr class="text-sm">
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ \Carbon\Carbon::parse($record->session_date)->format('d M Y') }}</td>
                                <td class="px-4 py-3 font-medium text-gray-900">{{ $record->session_type }}</td>
                                <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{{ ucfirst($record->status) }}</span></td>
                                <td class="px-4 py-3 text-gray-700">{{ $record->on_time ? 'Yes' : 'No' }}</td>
                                <td class="px-4 py-3 text-gray-700">{{ $record->late_minutes ?? 0 }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="px-4 py-12 text-center text-gray-400">No attendance records for {{ $year }}.</td></tr>
                        @endforelse
                    </tbody>
                @elseif($type === 'communication')
                    <thead class="bg-gray-50">
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Session</th>
                            <th class="px-4 py-3">Attendance</th>
                            <th class="px-4 py-3">Communicated</th>
                            <th class="px-4 py-3">Notes</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse($records as $record)
                            <tr class="text-sm">
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ \Carbon\Carbon::parse($record->session_date)->format('d M Y') }}</td>
                                <td class="px-4 py-3 font-medium text-gray-900">{{ $record->session_type }}</td>
                                <td class="px-4 py-3 text-gray-700">{{ ucfirst($record->status) }}</td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 rounded-full text-xs {{ $record->communicated ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600' }}">{{ $record->communicated ? 'Yes' : 'No' }}</span>
                                </td>
                                <td class="px-4 py-3 text-gray-500">{{ $record->notes ?: '—' }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="px-4 py-12 text-center text-gray-400">No communication records for {{ $year }}.</td></tr>
                        @endforelse
                    </tbody>
                @else
                    <thead class="bg-gray-50">
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Amount</th>
                            <th class="px-4 py-3">Term</th>
                            <th class="px-4 py-3">Method</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Reference</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        @forelse($records as $record)
                            <tr class="text-sm">
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ \Carbon\Carbon::parse($record->payment_date ?? $record->created_at)->format('d M Y') }}</td>
                                <td class="px-4 py-3 font-semibold text-gray-900">RWF {{ number_format($record->amount) }}</td>
                                <td class="px-4 py-3 text-gray-700">{{ $record->term ?: '—' }}</td>
                                <td class="px-4 py-3 text-gray-700">{{ $record->payment_method ?: '—' }}</td>
                                <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700">{{ ucfirst($record->status ?? 'recorded') }}</span></td>
                                <td class="px-4 py-3 text-gray-500">{{ $record->reference_number ?: '—' }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="px-4 py-12 text-center text-gray-400">No payments recorded for {{ $year }}.</td></tr>
                        @endforelse
                    </tbody>
                @endif
            </table>
        </div>
    </section>
</div>
@endsection
