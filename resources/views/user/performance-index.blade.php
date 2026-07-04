@extends('layouts.app')

@section('title', 'My Performance')
@section('page-title', 'My Performance')

@section('content')
<div class="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-5">
    <div class="mb-5">
        <h1 class="text-xl font-bold text-gray-900">My Performance</h1>
        <p class="text-sm text-gray-500 mt-1">Your personal results for {{ now()->year }}. Select a card to view its records.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <a href="{{ route('user.performance.show', 'discipline') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[200px] hover:border-emerald-300 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <h2 class="font-bold text-gray-900">Discipline Performance</h2>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#10b981 {{ $performance['discipline']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold">{{ $performance['discipline']['rate'] }}%</div>
                </div>
                <div class="text-sm">
                    <p class="font-semibold text-gray-600">Good Behavior Rate</p>
                    <p class="text-gray-900 mt-1">{{ $performance['discipline']['good'] }} good / {{ $performance['discipline']['total'] }} records</p>
                    <p class="text-xs text-gray-500 mt-1">Year {{ $performance['discipline']['year'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'attendance') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[200px] hover:border-emerald-300 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <h2 class="font-bold text-gray-900">Attendance Performance</h2>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#10b981 {{ $performance['attendance']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold">{{ $performance['attendance']['rate'] }}%</div>
                </div>
                <div class="text-sm">
                    <p class="font-semibold text-gray-600">Attendance Rate</p>
                    <p class="text-gray-900 mt-1">{{ $performance['attendance']['present'] }} attended / {{ $performance['attendance']['total'] }} sessions</p>
                    <p class="text-xs text-gray-500 mt-1">{{ $performance['attendance']['period'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'communication') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[200px] hover:border-blue-300 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <h2 class="font-bold text-gray-900">Communication Performance</h2>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#3b82f6 {{ $performance['communication']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold">{{ $performance['communication']['rate'] }}%</div>
                </div>
                <div class="text-sm">
                    <p class="font-semibold text-gray-600">Communication Rate</p>
                    <p class="text-gray-900 mt-1">{{ $performance['communication']['communicated'] }} communicated / {{ $performance['communication']['total'] }} sessions</p>
                    <p class="text-xs text-gray-500 mt-1">{{ $performance['communication']['period'] }}</p>
                </div>
            </div>
        </a>

        <a href="{{ route('user.performance.show', 'contribution') }}" class="block bg-white border border-gray-200 rounded-xl shadow-sm p-5 min-h-[200px] hover:border-orange-300 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <h2 class="font-bold text-gray-900">Contribution Progress</h2>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
            <div class="flex items-center gap-4 mt-6">
                <div class="w-20 h-20 rounded-full p-[6px] shrink-0" style="background: conic-gradient(#f97316 {{ $performance['contribution']['rate'] }}%, #e5e7eb 0)">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold">{{ $performance['contribution']['rate'] }}%</div>
                </div>
                <div class="text-sm">
                    <p class="font-semibold text-gray-600">Contribution Rate</p>
                    <p class="text-gray-900 mt-1">RWF {{ number_format($performance['contribution']['paid']) }} / RWF {{ number_format($performance['contribution']['expected']) }}</p>
                    <p class="text-xs text-gray-500 mt-1">Year {{ $performance['contribution']['year'] }}</p>
                </div>
            </div>
        </a>
    </div>
</div>
@endsection
