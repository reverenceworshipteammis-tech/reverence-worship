<?php

namespace App\Http\Controllers\Intercession;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User\User;

class FormController extends Controller
{
    // ==================== INDEX ====================
    public function index()
    {
        // Check permission
        if (!auth()->user()->canAccess('intercession', 'manage-forms')) {
            abort(403, 'You do not have permission to manage forms.');
        }

        $forms = DB::table('forms')->orderBy('created_at', 'desc')->get();

        // Get all forms for manage section
        $allForms = DB::table('forms')->orderBy('created_at', 'desc')->get();

        // Get available forms (published)
        $availableForms = DB::table('forms')
            ->where('settings', 'like', '%"is_published":true%')
            ->orderBy('created_at', 'desc')
            ->get();

        // Get user's submissions with form data
        $mySubmissions = DB::table('form_submissions')
            ->where('user_id', auth()->id())
            ->orderBy('submitted_at', 'desc')
            ->get();

        // Calculate stats
        $stats = [
            'total_forms' => $allForms->count(),
            'my_attempts' => $mySubmissions->count(),
            'best_avg' => 0,
        ];

        // Calculate best average from actual earned points
        if ($mySubmissions->count() > 0) {
            $bestAvg = 0;

            foreach ($mySubmissions as $submission) {
                $form = DB::table('forms')->where('id', $submission->form_id)->first();
                if ($form) {
                    $questions = json_decode($form->questions, true);
                    $answers = json_decode($submission->answers, true);
                    $settings = json_decode($form->settings, true);
                    $allowPartialPoints = $settings['allow_partial_points'] ?? true;

                    if ($questions && is_array($questions) && $answers && is_array($answers)) {
                        $totalPoints = 0;
                        $earnedPoints = 0;

                        foreach ($questions as $index => $question) {
                            $questionType = $question['type'] ?? 'short_answer';

                            // Skip sections
                            if ($questionType == 'title_section' || $questionType == 'section_break') {
                                continue;
                            }

                            $points = isset($question['points']) ? (int)$question['points'] : 1;
                            $totalPoints += $points;

                            $earnedPoints += $this->calculateAutomaticQuestionPoints(
                                $question,
                                $index,
                                $answers,
                                $allowPartialPoints
                            );
                        }

                        // Calculate score percentage for this submission
                        if ($totalPoints > 0) {
                            $score = round(($earnedPoints / $totalPoints) * 100, 1);

                            // Update best average if this score is higher
                            if ($score > $bestAvg) {
                                $bestAvg = $score;
                            }
                        }
                    }
                }
            }

            $stats['best_avg'] = $bestAvg;
        }

        // Load form details for submissions (for results section)
        $mySubmissionsWithForms = [];
        foreach ($mySubmissions as $submission) {
            $form = DB::table('forms')->where('id', $submission->form_id)->first();
            if ($form) {
                $submission->form = $form;
                $mySubmissionsWithForms[] = $submission;
            }
        }
        $mySubmissions = collect($mySubmissionsWithForms);

        // Get user permissions
        $canViewForms = auth()->user()->canAccess('intercession', 'view-forms');
        $canCreateForms = auth()->user()->canAccess('intercession', 'create-forms');
        $canManageForms = auth()->user()->canAccess('intercession', 'manage-forms');
        $canEditForms = auth()->user()->canAccess('intercession', 'edit-forms');
        $canDeleteForms = auth()->user()->canAccess('intercession', 'delete-forms');
        $canPublishForms = auth()->user()->canAccess('intercession', 'publish-forms');
        $canViewResults = auth()->user()->canAccess('intercession', 'view-results');
        $isSuperAdmin = auth()->user()->isSuperAdmin();

        return view('modules.intercession.index', compact(
            'forms',
            'allForms',
            'availableForms',
            'mySubmissions',
            'stats',
            'canViewForms',
            'canCreateForms',
            'canManageForms',
            'canEditForms',
            'canDeleteForms',
            'canPublishForms',
            'canViewResults',
            'isSuperAdmin'
        ));
    }

    // ==================== CREATE ====================
    public function create()
    {
        if (!auth()->user()->canAccess('intercession', 'create-forms')) {
            abort(403, 'You do not have permission to create forms.');
        }
        return view('modules.intercession.forms.create');
    }

    // ==================== STORE ====================
    public function store(Request $request)
    {
        if (!auth()->user()->canAccess('intercession', 'create-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            if ($request->isJson()) {
                $data = $request->json()->all();
            } else {
                $data = $request->all();
            }

            $title = $data['title'] ?? 'Untitled form';
            $description = $data['description'] ?? '';

            // Clean and filter questions - remove null/empty options
            $questions = [];
            if (isset($data['questions']) && is_array($data['questions'])) {
                foreach ($data['questions'] as $q) {
                    $cleanQuestion = [];

                    if (isset($q['type'])) $cleanQuestion['type'] = $q['type'];
                    if (isset($q['text']) && !empty($q['text'])) $cleanQuestion['text'] = $q['text'];
                    if (isset($q['title']) && !empty($q['title'])) $cleanQuestion['title'] = $q['title'];
                    if (isset($q['description']) && !empty($q['description'])) $cleanQuestion['description'] = $q['description'];
                    if (isset($q['imageUrl']) && !empty($q['imageUrl'])) $cleanQuestion['imageUrl'] = $q['imageUrl'];
                    if (isset($q['altText']) && !empty($q['altText'])) $cleanQuestion['altText'] = $q['altText'];
                    if (isset($q['required'])) $cleanQuestion['required'] = (bool)$q['required'];
                    if (isset($q['points'])) $cleanQuestion['points'] = (int)$q['points'];

                    // Clean options
                    if (isset($q['options']) && is_array($q['options'])) {
                        $cleanOptions = array_filter($q['options'], function ($opt) {
                            return $opt !== null && $opt !== 'null' && !empty($opt);
                        });
                        if (!empty($cleanOptions)) {
                            $cleanQuestion['options'] = array_values($cleanOptions);
                        }
                    }

                    // Clean rows
                    if (isset($q['rows']) && is_array($q['rows'])) {
                        $cleanRows = array_filter($q['rows'], function ($row) {
                            return $row !== null && !empty($row);
                        });
                        if (!empty($cleanRows)) $cleanQuestion['rows'] = array_values($cleanRows);
                    }

                    // Clean columns
                    if (isset($q['columns']) && is_array($q['columns'])) {
                        $cleanCols = array_filter($q['columns'], function ($col) {
                            return $col !== null && !empty($col);
                        });
                        if (!empty($cleanCols)) $cleanQuestion['columns'] = array_values($cleanCols);
                    }

                    // Handle scale values
                    if (isset($q['min'])) $cleanQuestion['min'] = (int)$q['min'];
                    if (isset($q['max'])) $cleanQuestion['max'] = (int)$q['max'];
                    if (isset($q['minLabel'])) $cleanQuestion['minLabel'] = $q['minLabel'];
                    if (isset($q['maxLabel'])) $cleanQuestion['maxLabel'] = $q['maxLabel'];

                    // Handle correct answers
                    if (isset($q['correctAnswer']) && !empty($q['correctAnswer'])) {
                        $cleanQuestion['correctAnswer'] = $q['correctAnswer'];
                    }

                    if (isset($q['correctAnswers']) && is_array($q['correctAnswers'])) {
                        $cleanAnswers = array_filter($q['correctAnswers'], function ($ans) {
                            return $ans !== null && !empty($ans);
                        });
                        if (!empty($cleanAnswers)) {
                            $cleanQuestion['correctAnswers'] = array_values($cleanAnswers);
                        }
                    }

                    $questions[] = $cleanQuestion;
                }
            }

            $settings = [];
            if (isset($data['settings']) && is_array($data['settings'])) {
                $settings = $data['settings'];
            }
            if (!isset($settings['is_published'])) $settings['is_published'] = false;

            $id = DB::table('forms')->insertGetId([
                'title' => $title,
                'description' => $description,
                'questions' => json_encode($questions),
                'settings' => json_encode($settings),
                'is_active' => true,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'form_id' => $id,
                'message' => 'Form created successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Form store error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== EDIT ====================
    public function edit($id)
    {
        if (!auth()->user()->canAccess('intercession', 'edit-forms')) {
            abort(403, 'You do not have permission to edit forms.');
        }

        $form = DB::table('forms')->where('id', $id)->first();
        if (!$form) {
            abort(404);
        }

        $form->questions = json_decode($form->questions, true);
        $form->settings = json_decode($form->settings, true);

        return view('modules.intercession.forms.edit', compact('form'));
    }

    // ==================== UPDATE ====================
    public function update(Request $request, $id)
    {
        if (!auth()->user()->canAccess('intercession', 'edit-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            if ($request->isJson()) {
                $data = $request->json()->all();
            } else {
                $data = $request->all();
            }

            $title = $data['title'] ?? 'Untitled form';
            $description = $data['description'] ?? '';

            // Clean and filter questions
            $questions = [];
            if (isset($data['questions']) && is_array($data['questions'])) {
                foreach ($data['questions'] as $q) {
                    $cleanQuestion = [];

                    if (isset($q['type'])) $cleanQuestion['type'] = $q['type'];
                    if (isset($q['text']) && !empty($q['text'])) $cleanQuestion['text'] = $q['text'];
                    if (isset($q['title']) && !empty($q['title'])) $cleanQuestion['title'] = $q['title'];
                    if (isset($q['description']) && !empty($q['description'])) $cleanQuestion['description'] = $q['description'];
                    if (isset($q['imageUrl']) && !empty($q['imageUrl'])) $cleanQuestion['imageUrl'] = $q['imageUrl'];
                    if (isset($q['required'])) $cleanQuestion['required'] = (bool)$q['required'];
                    if (isset($q['points'])) $cleanQuestion['points'] = (int)$q['points'];

                    if (isset($q['options']) && is_array($q['options'])) {
                        $cleanOptions = array_filter($q['options'], function ($opt) {
                            return $opt !== null && $opt !== 'null' && !empty($opt);
                        });
                        if (!empty($cleanOptions)) $cleanQuestion['options'] = array_values($cleanOptions);
                    }

                    if (isset($q['rows']) && is_array($q['rows'])) {
                        $cleanRows = array_filter($q['rows'], function ($row) {
                            return $row !== null && !empty($row);
                        });
                        if (!empty($cleanRows)) $cleanQuestion['rows'] = array_values($cleanRows);
                    }

                    if (isset($q['columns']) && is_array($q['columns'])) {
                        $cleanCols = array_filter($q['columns'], function ($col) {
                            return $col !== null && !empty($col);
                        });
                        if (!empty($cleanCols)) $cleanQuestion['columns'] = array_values($cleanCols);
                    }

                    if (isset($q['min'])) $cleanQuestion['min'] = (int)$q['min'];
                    if (isset($q['max'])) $cleanQuestion['max'] = (int)$q['max'];

                    if (isset($q['correctAnswer']) && !empty($q['correctAnswer'])) {
                        $cleanQuestion['correctAnswer'] = $q['correctAnswer'];
                    }

                    if (isset($q['correctAnswers']) && is_array($q['correctAnswers'])) {
                        $cleanAnswers = array_filter($q['correctAnswers'], function ($ans) {
                            return $ans !== null && !empty($ans);
                        });
                        if (!empty($cleanAnswers)) {
                            $cleanQuestion['correctAnswers'] = array_values($cleanAnswers);
                        }
                    }

                    $questions[] = $cleanQuestion;
                }
            }

            $existingForm = DB::table('forms')->where('id', $id)->first();
            $existingSettings = [];
            if ($existingForm) {
                $existingSettings = json_decode($existingForm->settings, true);
                if (!is_array($existingSettings)) {
                    $existingSettings = [];
                }
            }

            $settings = $data['settings'] ?? [];
            if (!is_array($settings)) {
                $settings = [];
            }

            if (!array_key_exists('is_published', $settings) && array_key_exists('is_published', $existingSettings)) {
                $settings['is_published'] = $existingSettings['is_published'];
            }

            $settings = array_merge($existingSettings, $settings);

            DB::table('forms')->where('id', $id)->update([
                'title' => $title,
                'description' => $description,
                'questions' => json_encode($questions),
                'settings' => json_encode($settings),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Form updated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Form update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== DESTROY ====================
    public function destroy($id)
    {
        if (!auth()->user()->canAccess('intercession', 'delete-forms')) {
            if (request()->ajax()) {
                return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
            }
            abort(403, 'You do not have permission to delete forms.');
        }

        try {
            DB::table('form_submissions')->where('form_id', $id)->delete();
            DB::table('forms')->where('id', $id)->delete();

            if (request()->ajax()) {
                return response()->json(['success' => true]);
            }

            return redirect()->back()->with('success', 'Form deleted successfully');
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ==================== DUPLICATE ====================
    public function duplicate($id)
    {
        if (!auth()->user()->canAccess('intercession', 'create-forms') && !auth()->user()->canAccess('intercession', 'edit-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $form = DB::table('forms')->where('id', $id)->first();
            if (!$form) {
                return response()->json(['success' => false, 'message' => 'Form not found'], 404);
            }

            $questions = json_decode($form->questions, true);
            if (!is_array($questions)) {
                $questions = [];
            }

            $settings = json_decode($form->settings, true);
            if (!is_array($settings)) {
                $settings = [];
            }

            $baseTitle = $form->title ?: 'Untitled form';
            $copyTitle = $baseTitle . ' (Copy)';

            $newId = DB::table('forms')->insertGetId([
                'title' => $copyTitle,
                'description' => $form->description ?? '',
                'questions' => json_encode($questions),
                'settings' => json_encode(array_merge($settings, ['is_published' => false])),
                'is_active' => true,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'form_id' => $newId,
                'message' => 'Form duplicated successfully',
                'redirect_url' => url("/forms/manage/{$newId}/edit")
            ]);
        } catch (\Exception $e) {
            Log::error('Form duplicate error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== TOGGLE PUBLISH ====================
    public function togglePublish($id)
    {
        if (!auth()->user()->canAccess('intercession', 'publish-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $form = DB::table('forms')->where('id', $id)->first();
            if (!$form) {
                return response()->json(['success' => false, 'message' => 'Form not found'], 404);
            }

            $settings = json_decode($form->settings, true);
            if (!is_array($settings)) {
                $settings = [];
            }

            $settings['is_published'] = !($settings['is_published'] ?? false);
            $isPublished = $settings['is_published'];

            DB::table('forms')->where('id', $id)->update([
                'settings' => json_encode($settings),
                'updated_at' => now()
            ]);

            $updatedForm = DB::table('forms')->where('id', $id)->first();
            $updatedForm->settings = json_decode($updatedForm->settings, true);

            return response()->json([
                'success' => true,
                'is_published' => $isPublished,
                'form' => $updatedForm,
                'message' => $isPublished ? 'Form published successfully' : 'Form unpublished'
            ]);
        } catch (\Exception $e) {
            Log::error('togglePublish error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ==================== TAKE ====================
    public function take($id)
    {
        $form = DB::table('forms')->where('id', $id)->first();
        if (!$form) abort(404);

        $questions = json_decode($form->questions, true);
        $settings = json_decode($form->settings, true);
        $isAvailableToUsers = $form->is_active && ($settings['is_published'] ?? false);

        if (!$isAvailableToUsers && !auth()->user()->canAccess('intercession', 'view-forms')) {
            abort(403, 'This form is not currently available.');
        }

        if (isset($settings['limit_one_response']) && $settings['limit_one_response']) {
            $hasSubmitted = DB::table('form_submissions')
                ->where('form_id', $id)
                ->where('user_id', auth()->id())
                ->exists();

            if ($hasSubmitted) {
                return redirect()->route('intercession.index')
                    ->with('error', 'You have already submitted this form. Only one response is allowed.');
            }
        }

        return view('modules.intercession.forms.take', compact('form', 'questions', 'settings'));
    }

    // ==================== SUBMIT ====================
    public function submit(Request $request, $id)
    {
        try {
            $form = DB::table('forms')->where('id', $id)->first();
            if (!$form) {
                return response()->json(['success' => false, 'message' => 'Form not found'], 404);
            }

            $settings = json_decode($form->settings, true);
            $isAvailableToUsers = $form->is_active && ($settings['is_published'] ?? false);

            if (!$isAvailableToUsers && !auth()->user()->canAccess('intercession', 'view-forms')) {
                return response()->json(['success' => false, 'message' => 'This form is not currently available.'], 403);
            }

            $questions = json_decode($form->questions, true);
            $allowPartialPoints = $settings['allow_partial_points'] ?? true;
            $isQuiz = isset($settings['is_quiz']) && $settings['is_quiz'];

            // Check if already submitted
            $hasSubmitted = DB::table('form_submissions')
                ->where('form_id', $id)
                ->where('user_id', auth()->id())
                ->exists();

            if ($hasSubmitted && isset($settings['limit_one_response']) && $settings['limit_one_response']) {
                return response()->json(['success' => false, 'message' => 'You have already submitted this form'], 400);
            }

            // Initialize answers array
            $answers = [];
            $allInputs = $request->except('_token');

            foreach ($allInputs as $key => $value) {
                if (is_array($value)) {
                    $answers[$key] = $value;
                } else {
                    $answers[$key] = $value;
                }
            }

            // Calculate score
            $totalPoints = 0;
            $earnedPoints = 0;

            if ($isQuiz) {
                foreach ($questions as $index => $question) {
                    $questionType = $question['type'] ?? 'short_answer';

                    // Skip sections
                    if ($questionType == 'title_section' || $questionType == 'section_break') {
                        continue;
                    }

                    $points = isset($question['points']) ? (int)$question['points'] : 1;
                    $totalPoints += $points;
                    $userAnswer = $request->input('question_' . $index);

                    // === MULTIPLE CHOICE / DROPDOWN ===
                    if ($questionType == 'multiple_choice' || $questionType == 'dropdown') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($userAnswer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        }
                    }

                    // === CHECKBOXES ===
                    elseif ($questionType == 'checkboxes') {
                        if (isset($question['correctAnswers']) && is_array($question['correctAnswers']) && !empty($question['correctAnswers'])) {
                            $userAnswers = is_array($userAnswer) ? array_values(array_unique($userAnswer)) : [];
                            $correctAnswers = array_values(array_unique($question['correctAnswers']));

                            if (!empty($userAnswers)) {
                                $totalCorrect = count($correctAnswers);
                                $correctSelected = count(array_intersect($userAnswers, $correctAnswers));
                                $incorrectSelected = count(array_diff($userAnswers, $correctAnswers));
                                $isExactMatch = $correctSelected === $totalCorrect
                                    && $incorrectSelected === 0
                                    && count($userAnswers) === $totalCorrect;

                                if ($allowPartialPoints && $totalCorrect > 0 && $correctSelected > 0) {
                                    $earnedPoints += ($correctSelected / $totalCorrect) * $points;
                                } elseif (!$allowPartialPoints && $isExactMatch) {
                                    $earnedPoints += $points;
                                }
                            }
                        }
                    }

                    // === SHORT ANSWER / PARAGRAPH ===
                    elseif ($questionType == 'short_answer' || $questionType == 'paragraph') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if (strtolower(trim((string) $userAnswer)) == strtolower(trim((string) $question['correctAnswer']))) {
                                $earnedPoints += $points;
                            }
                        }
                    }

                    // === DATE / TIME ===
                    elseif ($questionType == 'date' || $questionType == 'time') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($userAnswer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        }
                    }

                    // === LINEAR SCALE ===
                    elseif ($questionType == 'linear_scale') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($userAnswer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        } else {
                            if ($userAnswer !== null && $userAnswer !== '') {
                                $earnedPoints += $points;
                            }
                        }
                    }

                    // === RATING ===
                    elseif ($questionType == 'rating') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($userAnswer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        } else {
                            if ($userAnswer !== null && $userAnswer !== '') {
                                $earnedPoints += $points;
                            }
                        }
                    }

                    // === MULTIPLE CHOICE GRID ===
                    elseif ($questionType == 'multiple_choice_grid') {
                        if (isset($question['correctAnswers']) && is_array($question['correctAnswers'])) {
                            $rows = $question['rows'] ?? [];
                            $rowPoints = count($rows) > 0 ? $points / count($rows) : 0;

                            foreach ($rows as $rowIndex => $row) {
                                $rowKey = 'question_' . $index . '_' . $rowIndex;
                                $userRowAnswer = $request->input($rowKey);
                                $correctRowAnswer = $question['correctAnswers'][$rowIndex] ?? null;

                                if ($userRowAnswer !== null) {
                                    $answers[$rowKey] = $userRowAnswer;
                                }

                                if ($correctRowAnswer !== null && $correctRowAnswer !== '') {
                                    if ($userRowAnswer == $correctRowAnswer) {
                                        $earnedPoints += $rowPoints;
                                    }
                                }
                            }
                        }
                    }

                    // === CHECKBOX GRID ===
                    elseif ($questionType == 'checkbox_grid') {
                        if (isset($question['correctAnswers']) && is_array($question['correctAnswers'])) {
                            $rows = $question['rows'] ?? [];
                            $totalCorrect = 0;
                            $correctSelected = 0;
                            $isExactMatch = true;

                            foreach ($rows as $rowIndex => $row) {
                                $rowKey = 'question_' . $index . '_' . $rowIndex;
                                $userRowAnswers = $request->input($rowKey . '[]', []);
                                $correctRowAnswers = $question['correctAnswers'][$rowIndex] ?? [];

                                if (!empty($userRowAnswers)) {
                                    $answers[$rowKey] = $userRowAnswers;
                                }

                                $correctRowAnswers = array_values(array_unique((array) $correctRowAnswers));
                                $userRowAnswers = array_values(array_unique((array) $userRowAnswers));
                                $rowTotalCorrect = count($correctRowAnswers);
                                $rowCorrectSelected = count(array_intersect($userRowAnswers, $correctRowAnswers));
                                $rowIncorrectSelected = count(array_diff($userRowAnswers, $correctRowAnswers));
                                $rowExact = $rowTotalCorrect > 0
                                    && $rowCorrectSelected === $rowTotalCorrect
                                    && $rowIncorrectSelected === 0
                                    && count($userRowAnswers) === $rowTotalCorrect;

                                $totalCorrect += $rowTotalCorrect;
                                $correctSelected += $rowCorrectSelected;
                                if (!$rowExact) {
                                    $isExactMatch = false;
                                }
                            }

                            if ($allowPartialPoints && $totalCorrect > 0 && $correctSelected > 0) {
                                $earnedPoints += ($correctSelected / $totalCorrect) * $points;
                            } elseif (!$allowPartialPoints && $isExactMatch) {
                                $earnedPoints += $points;
                            }
                        }
                    }
                }

                $earnedPoints = round($earnedPoints, 2);
                $score = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100, 1) : 100;
            } else {
                $score = 100;
            }

            // Insert submission
            $submissionId = DB::table('form_submissions')->insertGetId([
                'form_id' => $id,
                'user_id' => auth()->id(),
                'answers' => json_encode($answers),
                'score' => $score,
                'submitted_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            if ($request->ajax() || $request->wantsJson()) {
                $response = [
                    'success' => true,
                    'message' => 'Form submitted successfully',
                    'form_id' => $id,
                    'submission_id' => $submissionId
                ];

                if ($isQuiz && ($settings['release_grade'] ?? 'immediately') === 'immediately') {
                    $response['score'] = $score;
                }

                return response()->json($response);
            }

            return redirect()->route('forms.results', ['id' => $id, 'submission_id' => $submissionId])
                ->with('success', 'Form submitted successfully!');
        } catch (\Exception $e) {
            Log::error('Form submission error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            if ($request->ajax() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage()
                ], 500);
            }
            return redirect()->back()->with('error', 'Error submitting form: ' . $e->getMessage());
        }
    }

    // ==================== MANUAL GRADING ====================
    public function gradeSubmissionQuestion(Request $request, $id)
    {
        if (!auth()->user()->isSuperAdmin()
            && !auth()->user()->canAccess('intercession', 'manage-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        $validated = $request->validate([
            'question_index' => ['required', 'integer', 'min:0'],
            'decision' => ['required', 'in:correct,incorrect,auto'],
        ]);

        $submission = DB::table('form_submissions')->where('id', $id)->first();
        if (!$submission) {
            return response()->json(['success' => false, 'message' => 'Submission not found'], 404);
        }
        if ((int) $submission->user_id === (int) auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot manually grade your own submission',
            ], 403);
        }

        $form = DB::table('forms')->where('id', $submission->form_id)->first();
        if (!$form) {
            return response()->json(['success' => false, 'message' => 'Form not found'], 404);
        }

        $questions = json_decode($form->questions, true) ?: [];
        $answers = json_decode($submission->answers, true) ?: [];
        $settings = json_decode($form->settings, true) ?: [];
        $questionIndex = $validated['question_index'];

        if (!isset($questions[$questionIndex])) {
            return response()->json(['success' => false, 'message' => 'Question not found'], 422);
        }

        $questionType = $questions[$questionIndex]['type'] ?? 'short_answer';
        if (in_array($questionType, ['title_section', 'section_break'], true)) {
            return response()->json(['success' => false, 'message' => 'Sections cannot be graded'], 422);
        }

        $manualGrades = json_decode($submission->manual_grades ?? '[]', true) ?: [];
        if ($validated['decision'] === 'auto') {
            unset($manualGrades[$questionIndex]);
        } else {
            $manualGrades[$questionIndex] = [
                'decision' => $validated['decision'],
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now()->toIso8601String(),
            ];
        }

        $totalPoints = 0;
        $earnedPoints = 0;
        $allowPartialPoints = $settings['allow_partial_points'] ?? true;

        foreach ($questions as $index => $question) {
            $type = $question['type'] ?? 'short_answer';
            if (in_array($type, ['title_section', 'section_break'], true)) {
                continue;
            }

            $points = (float) ($question['points'] ?? 1);
            $totalPoints += $points;
            $decision = $manualGrades[$index]['decision'] ?? null;

            if ($decision === 'correct') {
                $earnedPoints += $points;
            } elseif ($decision !== 'incorrect') {
                $earnedPoints += $this->calculateAutomaticQuestionPoints(
                    $question,
                    $index,
                    $answers,
                    $allowPartialPoints
                );
            }
        }

        $score = $totalPoints > 0
            ? round(min(100, max(0, ($earnedPoints / $totalPoints) * 100)), 1)
            : 0;

        DB::table('form_submissions')->where('id', $id)->update([
            'manual_grades' => json_encode($manualGrades),
            'score' => $score,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['decision'] === 'auto'
                ? 'Automatic grading restored'
                : 'Manual grade saved',
            'score' => $score,
        ]);
    }

    private function calculateAutomaticQuestionPoints(
        array $question,
        int $index,
        array $answers,
        bool $allowPartialPoints
    ): float {
        $type = $question['type'] ?? 'short_answer';
        $points = (float) ($question['points'] ?? 1);
        $answerKey = 'question_' . $index;
        $answer = $answers[$answerKey] ?? null;

        if (in_array($type, ['multiple_choice', 'dropdown', 'date', 'time'], true)) {
            $correct = $question['correctAnswer'] ?? null;
            return $correct !== null && $correct !== '' && $answer == $correct ? $points : 0;
        }

        if (in_array($type, ['short_answer', 'paragraph'], true)) {
            $correct = trim((string) ($question['correctAnswer'] ?? ''));
            return $correct !== '' && mb_strtolower(trim((string) $answer)) === mb_strtolower($correct)
                ? $points
                : 0;
        }

        if ($type === 'checkboxes') {
            $correct = array_values(array_unique($question['correctAnswers'] ?? []));
            $selected = is_array($answer) ? array_values(array_unique($answer)) : [];
            if (!$correct || !$selected) {
                return 0;
            }

            $correctCount = count(array_intersect($selected, $correct));
            $incorrectCount = count(array_diff($selected, $correct));
            $exact = $correctCount === count($correct)
                && $incorrectCount === 0
                && count($selected) === count($correct);

            if (!$allowPartialPoints) {
                return $exact ? $points : 0;
            }

            return round(($correctCount / count($correct)) * $points, 2);
        }

        if (in_array($type, ['linear_scale', 'rating'], true)) {
            $correct = $question['correctAnswer'] ?? null;
            if ($correct !== null && $correct !== '') {
                return $answer == $correct ? $points : 0;
            }
            return $answer !== null && $answer !== '' ? $points : 0;
        }

        if (in_array($type, ['multiple_choice_grid', 'checkbox_grid'], true)) {
            $rows = $question['rows'] ?? [];
            $correctAnswers = $question['correctAnswers'] ?? [];
            $nestedAnswers = is_array($answer) ? $answer : [];

            if ($type === 'multiple_choice_grid') {
                $rowPoints = count($rows) ? $points / count($rows) : 0;
                $earned = 0;

                foreach ($rows as $rowIndex => $row) {
                    $rowKey = $answerKey . '_' . $rowIndex;
                    $userRowAnswer = $answers[$rowKey] ?? ($nestedAnswers[$rowKey] ?? null);
                    $correctRowAnswer = $correctAnswers[$rowIndex] ?? null;

                    if ($correctRowAnswer !== null && $correctRowAnswer !== '' && $userRowAnswer == $correctRowAnswer) {
                        $earned += $rowPoints;
                    }
                }

                return round($earned, 2);
            }

            $totalCorrect = 0;
            $correctSelected = 0;
            $allExact = true;

            foreach ($rows as $rowIndex => $row) {
                $rowKey = $answerKey . '_' . $rowIndex;
                $userRowAnswer = $answers[$rowKey] ?? ($nestedAnswers[$rowKey] ?? null);
                $correctRowAnswer = $correctAnswers[$rowIndex] ?? [];

                $correct = is_array($correctRowAnswer) ? array_values(array_unique($correctRowAnswer)) : [];
                $selected = is_array($userRowAnswer) ? array_values(array_unique($userRowAnswer)) : [];

                if (!$correct) {
                    continue;
                }

                $rowCorrectCount = count(array_intersect($selected, $correct));
                $rowIncorrectCount = count(array_diff($selected, $correct));
                $rowExact = $rowCorrectCount === count($correct)
                    && $rowIncorrectCount === 0
                    && count($selected) === count($correct);

                $totalCorrect += count($correct);
                $correctSelected += $rowCorrectCount;
                if (!$rowExact) {
                    $allExact = false;
                }
            }

            if (!$allowPartialPoints) {
                return $allExact && $totalCorrect > 0 ? $points : 0;
            }

            return $totalCorrect > 0 && $correctSelected > 0
                ? round(($correctSelected / $totalCorrect) * $points, 2)
                : 0;
        }

        return 0;
    }

    // ==================== RELEASE SUBMISSION ====================
    public function releaseSubmission($id)
    {
        if (!auth()->user()->canAccess('intercession', 'publish-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $submission = DB::table('form_submissions')->where('id', $id)->first();
            if (!$submission) {
                return response()->json(['success' => false, 'message' => 'Submission not found'], 404);
            }

            DB::table('form_submissions')
                ->where('id', $id)
                ->update([
                    'released_at' => now(),
                    'is_released' => true,
                    'updated_at' => now()
                ]);

            if (DB::getSchemaBuilder()->hasTable('form_result_notification_reads')) {
                DB::table('form_result_notification_reads')
                    ->where('submission_id', $id)
                    ->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'Submission released successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('releaseSubmission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== UNRELEASE SUBMISSION ====================
    public function unreleaseSubmission($id)
    {
        if (!auth()->user()->canAccess('intercession', 'publish-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $submission = DB::table('form_submissions')->where('id', $id)->first();
            if (!$submission) {
                return response()->json(['success' => false, 'message' => 'Submission not found'], 404);
            }

            DB::table('form_submissions')
                ->where('id', $id)
                ->update([
                    'released_at' => null,
                    'is_released' => false,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Submission unreleased successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('unreleaseSubmission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== BULK RELEASE ====================
    public function bulkRelease(Request $request)
    {
        if (!auth()->user()->canAccess('intercession', 'publish-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $formId = $request->input('form_id');
            if (!$formId) {
                return response()->json(['success' => false, 'message' => 'Form ID is required'], 400);
            }

            $count = DB::table('form_submissions')
                ->where('form_id', $formId)
                ->whereNull('released_at')
                ->where(function ($query) {
                    $query->where('is_released', false)
                        ->orWhereNull('is_released');
                })
                ->whereNotNull('score')
                ->update([
                    'released_at' => now(),
                    'is_released' => true,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => $count . ' submission(s) released successfully',
                'count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('bulkRelease error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== BULK UNRELEASE ====================
    public function bulkUnrelease(Request $request)
    {
        if (!auth()->user()->canAccess('intercession', 'publish-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            $formId = $request->input('form_id');
            if (!$formId) {
                return response()->json(['success' => false, 'message' => 'Form ID is required'], 400);
            }

            $submissionIds = DB::table('form_submissions')
                ->where('form_id', $formId)
                ->whereNotNull('released_at')
                ->pluck('id');

            $count = DB::table('form_submissions')
                ->whereIn('id', $submissionIds)
                ->update([
                    'released_at' => null,
                    'is_released' => false,
                    'updated_at' => now()
                ]);

            if ($submissionIds->isNotEmpty() && DB::getSchemaBuilder()->hasTable('form_result_notification_reads')) {
                DB::table('form_result_notification_reads')
                    ->whereIn('submission_id', $submissionIds)
                    ->delete();
            }

            return response()->json([
                'success' => true,
                'message' => $count . ' submission(s) unreleased successfully',
                'count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('bulkUnrelease error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== DELETE SUBMISSION ====================
    public function deleteSubmission($id)
    {
        if (!auth()->user()->canAccess('intercession', 'delete-forms')) {
            return response()->json(['success' => false, 'message' => 'Permission denied'], 403);
        }

        try {
            DB::table('form_submissions')->where('id', $id)->delete();
            return response()->json([
                'success' => true,
                'message' => 'Submission deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('deleteSubmission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== GET AVAILABLE FORMS ====================
    public function getAvailableForms(Request $request)
    {
        try {
            $forms = DB::table('forms')
                ->where('is_active', true)
                ->whereRaw("(settings::jsonb ->> 'is_published') = 'true'")
                ->orderBy('created_at', 'desc')
                ->get();
            $mySubmissions = DB::table('form_submissions')
                ->where('user_id', auth()->id())
                ->orderBy('submitted_at', 'desc')
                ->select('form_id', 'id')
                ->get();

            $mySubmissionIds = [];
            foreach ($mySubmissions as $submission) {
                if (!isset($mySubmissionIds[$submission->form_id])) {
                    $mySubmissionIds[$submission->form_id] = $submission->id;
                }
            }

            return response()->json([
                'success' => true,
                'forms' => $forms,
                'mySubmissionIds' => $mySubmissionIds,
                'canCreate' => auth()->user()->canAccess('intercession', 'create-forms')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    // ==================== SUBMISSIONS (ADMIN) ====================
    public function submissions($id)
    {
        if (!auth()->user()->isSuperAdmin()
            && !auth()->user()->canAccess('intercession', 'view-results')
            && !auth()->user()->canAccess('intercession', 'manage-forms')) {
            abort(403, 'You do not have permission to view submissions.');
        }

        $form = DB::table('forms')->where('id', $id)->first();
        if (!$form) {
            abort(404);
        }

        $questions = json_decode($form->questions, true);

        $submissions = DB::table('form_submissions')
            ->where('form_id', $id)
            ->leftJoin('users', 'form_submissions.user_id', '=', 'users.id')
            ->select('form_submissions.*', 'users.name as user_name', 'users.email')
            ->orderBy('submitted_at', 'desc')
            ->get();

        return view('modules.intercession.forms.submissions', compact('submissions', 'form', 'questions'));
    }

    public function reviewSubmission($formId, $submissionId)
    {
        if (!auth()->user()->isSuperAdmin()
            && !auth()->user()->canAccess('intercession', 'manage-forms')) {
            abort(403, 'You do not have permission to review submissions.');
        }

        $submission = DB::table('form_submissions')
            ->where('id', $submissionId)
            ->where('form_id', $formId)
            ->first();

        if (!$submission) {
            abort(404, 'Submission not found.');
        }

        $form = DB::table('forms')->where('id', $formId)->first();
        if (!$form) {
            abort(404, 'Form not found.');
        }

        $questions = json_decode($form->questions, true) ?: [];
        $answers = json_decode($submission->answers, true) ?: [];
        $userName = DB::table('users')->where('id', $submission->user_id)->value('name') ?? 'Unknown User';
        $managerReviewMode = true;
        $managerReadOnly = (int) $submission->user_id === (int) auth()->id();

        return view('modules.intercession.forms.review', compact(
            'form',
            'questions',
            'answers',
            'submission',
            'userName',
            'managerReviewMode',
            'managerReadOnly'
        ));
    }

    // ==================== RESULTS ====================
    public function results($id, Request $request)
    {
        $submissionId = $request->get('submission_id');

        if ($submissionId) {
            $submission = DB::table('form_submissions')
                ->where('id', $submissionId)
                ->where('form_id', $id)
                ->first();

            if (!$submission) {
                return redirect()->route('intercession.index')->with('error', 'Submission not found');
            }

            $isOwner = (int) $submission->user_id === (int) auth()->id();
            $canViewOtherResults = auth()->user()->isSuperAdmin()
                || auth()->user()->canAccess('intercession', 'view-results')
                || auth()->user()->canAccess('intercession', 'manage-forms');

            if (!$isOwner && !$canViewOtherResults) {
                abort(403, 'You do not have permission to view this result.');
            }
        } else {
            $submission = DB::table('form_submissions')
                ->where('form_id', $id)
                ->where('user_id', auth()->id())
                ->orderBy('submitted_at', 'desc')
                ->first();

            if (!$submission) {
                return redirect()->route('intercession.index')->with('error', 'No submission found');
            }
        }

        $form = DB::table('forms')->where('id', $id)->first();
        if (!$form) {
            abort(404);
        }

        $questions = json_decode($form->questions, true);
        $answers = json_decode($submission->answers, true);

        $userName = 'Unknown User';
        if (isset($submission->user_id)) {
            $user = DB::table('users')->where('id', $submission->user_id)->first();
            if ($user) {
                $userName = $user->name;
            }
        }

        return view('modules.intercession.forms.results', compact('form', 'questions', 'answers', 'submission', 'userName'));
    }

    // ==================== DEBUG CHECKBOX GRID ====================
    public function debugCheckboxGrid()
    {
        $submission = DB::table('form_submissions')
            ->orderBy('id', 'desc')
            ->first();

        if (!$submission) {
            return "No submissions found. Please submit a form first.";
        }

        $form = DB::table('forms')
            ->where('id', $submission->form_id)
            ->first();

        if (!$form) {
            return "Form not found for submission ID: " . $submission->id;
        }

        $questions = json_decode($form->questions, true);
        $answers = json_decode($submission->answers, true);
        $settings = json_decode($form->settings, true);

        $hasCheckboxGrid = false;
        foreach ($questions as $q) {
            if (isset($q['type']) && $q['type'] == 'checkbox_grid') {
                $hasCheckboxGrid = true;
                break;
            }
        }

        if (!$hasCheckboxGrid) {
            return "No checkbox grid questions found in the latest submission.";
        }

        $allowPartialPoints = $settings['allow_partial_points'] ?? true;
        $totalPoints = 0;
        $earnedPoints = 0;
        $questionDetails = [];

        foreach ($questions as $index => $question) {
            $questionType = $question['type'] ?? 'short_answer';

            if ($questionType == 'title_section' || $questionType == 'section_break') {
                continue;
            }

            $points = isset($question['points']) ? (int)$question['points'] : 1;
            $totalPoints += $points;
            $answerKey = 'question_' . $index;
            $userAnswer = $answers[$answerKey] ?? null;
            $earned = 0;
            $details = [];

            if ($questionType == 'multiple_choice' || $questionType == 'dropdown') {
                if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                    if ($userAnswer == $question['correctAnswer']) {
                        $earned = $points;
                    }
                }
                $details = [
                    'type' => $questionType,
                    'points' => $points,
                    'user_answer' => $userAnswer,
                    'correct_answer' => $question['correctAnswer'] ?? null,
                    'earned' => $earned,
                    'status' => $earned > 0 ? '✅ Correct' : '❌ Wrong'
                ];
            } elseif ($questionType == 'checkboxes') {
                // ... (keep existing checkboxes logic)
            } elseif ($questionType == 'checkbox_grid') {
                $rows = $question['rows'] ?? [];
                $gridEarned = 0;
                $gridDetails = [];
                $totalCorrect = 0;
                $correctSelected = 0;
                $allExact = true;

                foreach ($rows as $rowIndex => $row) {
                    $correctRowAnswers = array_values(array_unique((array) ($question['correctAnswers'][$rowIndex] ?? [])));
                    $totalCorrect += count($correctRowAnswers);
                }

                foreach ($rows as $rowIndex => $row) {
                    $rowKey = 'question_' . $index . '_' . $rowIndex;
                    $userRowAnswers = isset($answers[$rowKey]) ? (array)$answers[$rowKey] : [];
                    $correctRowAnswers = array_values(array_unique((array) ($question['correctAnswers'][$rowIndex] ?? [])));
                    $selected = array_values(array_unique($userRowAnswers));
                    $correctCount = count(array_intersect($selected, $correctRowAnswers));
                    $incorrectCount = count(array_diff($selected, $correctRowAnswers));
                    $rowExact = !empty($correctRowAnswers)
                        && $correctCount === count($correctRowAnswers)
                        && $incorrectCount === 0
                        && count($selected) === count($correctRowAnswers);

                    $correctSelected += $correctCount;
                    if (!empty($correctRowAnswers) && !$rowExact) {
                        $allExact = false;
                    }

                    $rowEarned = 0;
                    if ($allowPartialPoints) {
                        $rowEarned = $totalCorrect > 0
                            ? round(($correctCount / $totalCorrect) * $points, 2)
                            : 0;
                    } elseif ($rowExact) {
                        $rowEarned = $points;
                    }

                    $gridEarned += $rowEarned;
                    $gridDetails[] = [
                        'row' => $row,
                        'user_answer' => json_encode($selected),
                        'correct_answer' => json_encode($correctRowAnswers),
                        'correct_count' => $correctCount,
                        'total_correct' => count($correctRowAnswers),
                        'row_points' => $totalCorrect > 0
                            ? round(($points * count($correctRowAnswers)) / $totalCorrect, 2)
                            : 0,
                        'earned' => $rowEarned,
                        'status' => $rowExact ? '✅ Full' : ($correctCount > 0 ? '⚠️ Partial' : '❌ Wrong'),
                    ];
                }

                $gridEarned = $allowPartialPoints
                    ? ($totalCorrect > 0 && $correctSelected > 0 ? round(($correctSelected / $totalCorrect) * $points, 2) : 0)
                    : ($allExact && $totalCorrect > 0 ? $points : 0);
                $earned = $gridEarned;
                $details = [
                    'type' => $questionType,
                    'points' => $points,
                    'row_points' => $points,
                    'rows' => $gridDetails,
                    'earned' => $earned,
                    'status' => $earned > 0 ? ($earned == $points ? '✅ Full' : '⚠️ Partial') : '❌ Wrong',
                ];
            }

            $earnedPoints += $earned;
            $questionDetails[$index] = $details;
        }

        // Render debug page (keep existing HTML)
        // ... (rest of debug rendering)
    }
}
