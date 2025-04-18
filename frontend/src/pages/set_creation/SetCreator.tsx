import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X as XIcon,
  Plus as PlusIcon,
  ChevronLeft as ChevronLeftIcon,
  Sparkles as SparklesIcon,
  AlertCircle as AlertCircleIcon,
  Save as SaveIcon,
  Globe as GlobeIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from 'lucide-react';
import NavBar from '../../components/NavBar';
import AIGenerateOverlay from '../../components/AIGenerateOverlay';

// Type definitions
type Flashcard = {
  question: string;
  answer: string;
};

type FlashcardSet = {
  id: string;
  title: string;
  classCode: string;
  description?: string;
  numCards?: number;
  flashcards: Flashcard[];
  isPublic: boolean;
  icon?: string;
  createdAt?: string;
  userId?: string; // Track the owner of the set
  username?: string; // Add username of the creator
};

const SetCreator: React.FC = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([{ question: '', answer: '' }]);
  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('');
  const [description, setDescription] = useState(''); // New state for description
  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitDestination, setExitDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoTips, setShowInfoTips] = useState(() => {
    // Check localStorage for user preference
    return localStorage.getItem('hideCreatorInfoTips') !== 'true';
  });
  
  // State for error messages
  const [titleError, setTitleError] = useState('');
  const [classCodeError, setClassCodeError] = useState('');
  const [flashcardError, setFlashcardError] = useState('');
  const [descriptionError, setDescriptionError] = useState(''); // New error state for description
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New state for AI Generate Overlay
  const [showAIGenerateOverlay, setShowAIGenerateOverlay] = useState(false);
  
  const autocompleteRef = useRef<HTMLUListElement>(null);
  const classCodeInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch class codes from CSV file
  const fetchClassCodes = async () => {
    try {
      const response = await fetch("/data/class_codes.csv");
      const text = await response.text();
      const codes = text.split("\n").map(code => code.trim()).filter(code => code.length > 0);
      setClassCodes(codes);
    } catch (error) {
      console.error("Error loading class codes:", error);
    }
  };

  // Check if we're editing an existing set and if it belongs to the current user
  const checkForEditingMode = () => {
    const storedSet = localStorage.getItem("editingFlashcardSet");
    if (storedSet) {
      const parsedSet = JSON.parse(storedSet) as FlashcardSet;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Only load the stored set if it belongs to the current user.
      if (user && (user.id === parsedSet.userId || user.uid === parsedSet.userId)) {
        setEditingSet(parsedSet);
        setTitle(parsedSet.title || '');
        setClassCode(parsedSet.classCode || '');
        setDescription(parsedSet.description || ''); // Load description if available
        if (Array.isArray(parsedSet.flashcards) && parsedSet.flashcards.length > 0) {
          setFlashcards(parsedSet.flashcards);
        }
      } else {
        // If it doesn't belong to the current user, clear it.
        localStorage.removeItem("editingFlashcardSet");
      }
    }
  };

  // Fetch class codes and check for editing mode on component mount
  useEffect(() => {
    fetchClassCodes();
    checkForEditingMode();
    
    // Check authentication - but don't redirect immediately
    const checkAuth = () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user || (!user.id && !user.uid)) {
        console.log('No authenticated user found, redirecting to landing page');
        navigate('/');
      }
    };
    
    const timer = setTimeout(checkAuth, 300);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current && 
        !autocompleteRef.current.contains(event.target as Node) &&
        classCodeInputRef.current !== event.target
      ) {
        setSuggestions([]);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Handle class code input and show suggestions
  const handleClassCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toUpperCase();
    setClassCode(value);
    setClassCodeError('');
    
    if (value.length > 0) {
      const filteredResults = classCodes
        .filter(code => code.toUpperCase().startsWith(value))
        .slice(0, 5);
      setSuggestions(filteredResults);
    } else {
      setSuggestions([]);
    }
  }, [classCodes]);

  // Handle title input changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setTitleError('');
  };

  // Handle autocomplete item selection
  const handleAutocompleteSelect = useCallback((code: string) => {
    setClassCode(code);
    setSuggestions([]);
    setClassCodeError('');
  }, []);

  // Validate class code on blur
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (classCode.trim() !== '' && !classCodes.includes(classCode.trim().toUpperCase())) {
        setClassCodeError("Please select a valid class code from the list");
        setTimeout(() => {
          setClassCode('');
          setTimeout(() => {
            setClassCodeError('');
          }, 3000);
        }, 1500);
      }
    }, 100);
  }, [classCode, classCodes]);

  // Add a new flashcard
  const addFlashcard = () => {
    setFlashcards([...flashcards, { question: '', answer: '' }]);
    setFlashcardError('');
  };

  // Update a flashcard
  const updateFlashcard = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedFlashcards = [...flashcards];
    updatedFlashcards[index][field] = value;
    setFlashcards(updatedFlashcards);
    setFlashcardError('');
  };

  // Delete a flashcard
  const deleteFlashcard = (index: number) => {
    if (flashcards.length <= 1) {
      setFlashcards([{ question: '', answer: '' }]);
    } else {
      const updatedFlashcards = flashcards.filter((_, i) => i !== index);
      setFlashcards(updatedFlashcards);
    }
  };

  // Navigate with confirmation if needed
  const navigateWithConfirmation = (destination: string) => {
    const hasContent = flashcards.some(card => card.question.trim() || card.answer.trim());
    if (!hasContent && flashcards.length === 1) {
      navigate(destination);
      return;
    }
    
    if (editingSet) {
      const noChanges = 
        editingSet.title === title &&
        editingSet.classCode === classCode &&
        editingSet.description === description && // Check if description is unchanged
        areFlashcardsEqual(editingSet.flashcards, flashcards);
      
      if (noChanges) {
        navigate(destination);
        return;
      }
    }
    
    setExitDestination(destination);
    setShowExitModal(true);
  };

  // Compare flashcard arrays
  const areFlashcardsEqual = (arr1: Flashcard[], arr2: Flashcard[]) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((flashcard, index) => 
      flashcard.question === arr2[index].question &&
      flashcard.answer === arr2[index].answer
    );
  };

  // Validate form before saving
  const validateForm = () => {
    let isValid = true;
    setTitleError('');
    setClassCodeError('');
    setFlashcardError('');
    setDescriptionError('');
    
    if (!title.trim()) {
      setTitleError("Please provide a title for your flashcard set");
      titleInputRef.current?.focus();
      isValid = false;
    }
    
    if (!classCode.trim()) {
      setClassCodeError("Please select a valid class code");
      if (isValid) {
        classCodeInputRef.current?.focus();
      }
      isValid = false;
    } else if (!classCodes.includes(classCode.trim().toUpperCase())) {
      setClassCodeError("Invalid class code! Please select from the list");
      if (isValid) {
        classCodeInputRef.current?.focus();
      }
      isValid = false;
    }
    
    // Optional description validation
    if (description.trim().length > 500) {
      setDescriptionError("Description must be 500 characters or less");
      isValid = false;
    }
    
    const validFlashcards = flashcards.filter(
      card => card.question.trim() || card.answer.trim()
    );
    
    if (validFlashcards.length === 0) {
      setFlashcardError("You need to add at least one flashcard with content");
      isValid = false;
    }
    
    return isValid;
  };

// Save flashcard set
const saveFlashcardSet = async (isPublic: boolean) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id && !user.uid) {
      setFlashcardError("You must be logged in to save a set");
      return;
    }
    
    const userId = user.id || user.uid;
    // Get the username from localStorage. If not available, fallback to email or displayName
    const username = user.username || user.displayName || user.email || "Anonymous User";
    
    if (!validateForm()) {
      return;
    }
    
    const validFlashcards = flashcards.filter(
      card => card.question.trim() || card.answer.trim()
    );
    
    const setId = editingSet?.id || crypto.randomUUID();
    
    const newSet: FlashcardSet = {
      id: setId,
      title: title.trim(),
      classCode: classCode.trim(),
      description: description.trim(),
      flashcards: validFlashcards,
      isPublic: isPublic,
      userId: userId,
      username: username, // Add the username to the set
      createdAt: editingSet?.createdAt || new Date().toISOString() // Add creation timestamp if not already present
    };
    
    setIsLoading(true);
    console.log('Sending data to backend:', JSON.stringify(newSet));
    
    const endpoint = editingSet 
      ? `http://localhost:6500/api/sets/update/${setId}`
      : 'http://localhost:6500/api/sets/create';
      
    const method = editingSet ? 'PUT' : 'POST';
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(newSet)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      console.log(`Flashcard set ${editingSet ? 'updated' : 'saved'} successfully`);
      localStorage.removeItem("editingFlashcardSet");
      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/created-sets');
      }, 1500);
    } else {
      try {
        const errorData = await response.json();
        setFlashcardError(`Failed to ${editingSet ? 'update' : 'save'} flashcard set. ${errorData.message || ''}`);
      } catch (parseError) {
        setFlashcardError(`Failed to ${editingSet ? 'update' : 'save'} flashcard set. Server returned ${response.status} ${response.statusText}.`);
      }
    }
  } catch (error) {
    console.error("Error saving flashcard set:", error);
    setFlashcardError("Failed to save flashcard set. Please check your connection and try again.");
  } finally {
    setIsLoading(false);
  }
};

  const handleSaveAndExit = () => {
    if (validateForm()) {
      saveFlashcardSet(false);
      setShowExitModal(false);
    }
  };

  const handleExitWithoutSaving = () => {
    localStorage.removeItem("editingFlashcardSet");
    navigate(exitDestination);
    setShowExitModal(false);
  };

  // Check if there are any non-empty flashcards
  const hasValidContent = flashcards.some(card => card.question.trim() || card.answer.trim());

  // Handler for AI Generated Flashcards
  const handleAIGeneratedFlashcards = (generatedFlashcards: Flashcard[]) => {
    const currentFlashcards = flashcards.filter(card => card.question.trim() || card.answer.trim());
    const finalFlashcards = currentFlashcards.length === 0 
      ? generatedFlashcards 
      : [...currentFlashcards, ...generatedFlashcards];

    setFlashcards(finalFlashcards);
    setShowAIGenerateOverlay(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Success Message */}
      {saveSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border border-green-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xl font-semibold text-gray-900">Saved Successfully!</p>
              <p className="text-gray-500 mt-2">Redirecting to your flashcard sets...</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header with back button and page title */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigateWithConfirmation('/created-sets')}
            className="flex items-center text-sm bg-white px-3 py-2 rounded-lg shadow-sm border border-[#004a74]/20 text-[#004a74] hover:bg-[#e3f3ff] transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back to Created Sets
          </button>
          <h1 className="text-xl font-bold text-[#004a74]">
            {editingSet ? 'Edit Flashcard Set' : 'Create New Flashcard Set'}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Progress indicator */}
          <div className="bg-[#004a74] px-6 py-4 text-white">
            <h2 className="text-xl font-bold">
              {editingSet ? 'Editing: ' + editingSet.title : 'New Flashcard Set'}
            </h2>
            <div className="flex items-center mt-2 text-sm">
              <div className="flex-1">
                <div className="w-full bg-white/20 rounded-full h-2.5">
                  <div className="bg-white h-2.5 rounded-full" style={{ 
                    width: `${Math.min(100, 
                      (title ? 33 : 0) + 
                      (classCode ? 33 : 0) + 
                      (hasValidContent ? 34 : 0)
                    )}%` 
                  }}></div>
                </div>
              </div>
              <span className="ml-3 font-medium">
                {title && classCode && hasValidContent 
                  ? 'Ready to save!' 
                  : 'Complete all fields'}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* Info panel */}
            {showInfoTips && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <InfoIcon className="w-5 h-5 text-[#004a74] mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-[#004a74]">
                      {editingSet ? 'Editing Mode' : 'Creating a New Flashcard Set'}
                    </h3>
                    <ul className="mt-2 text-sm text-[#004a74]/80 space-y-1">
                      <li>• Fill in the set title and select a class code</li>
                      <li>• Add at least one flashcard with a question and answer</li>
                      <li>• Save as private (only you can see) or publish publicly (everyone can see)</li>
                    </ul>
                    <div className="mt-3 flex items-center">
                      <input 
                        type="checkbox" 
                        id="dontShowAgainCreator" 
                        className="h-4 w-4 text-[#004a74] rounded border-gray-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            localStorage.setItem('hideCreatorInfoTips', 'true');
                          } else {
                            localStorage.removeItem('hideCreatorInfoTips');
                          }
                        }}
                      />
                      <label htmlFor="dontShowAgainCreator" className="ml-2 text-xs text-[#004a74]/80">
                        Don't show this tip again
                      </label>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInfoTips(false)}
                    className="text-[#004a74] hover:bg-blue-100 p-1 rounded-full h-6 w-6 flex items-center justify-center"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Title and Class Code Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Set Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="E.g., BIO 101 Midterm"
                  className={`w-full px-4 py-3 text-base rounded-lg border 
                    focus:outline-none focus:ring-2 transition-all 
                    ${titleError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#004a74]/20'}`}
                />
                {titleError && (
                  <div className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircleIcon className="w-4 h-4 mr-1" />
                    {titleError}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Class Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="classCode"
                    ref={classCodeInputRef}
                    type="text"
                    value={classCode}
                    onChange={handleClassCodeChange}
                    onBlur={handleBlur}
                    placeholder="E.g., CSE101"
                    className={`w-full px-4 py-3 text-base rounded-lg border 
                      focus:outline-none focus:ring-2 transition-all 
                      ${classCodeError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#004a74]/20'}`}
                    autoComplete="off"
                  />
                  
                  {classCodeError && (
                    <div className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircleIcon className="w-4 h-4 mr-1" />
                      {classCodeError}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <ul 
                      ref={autocompleteRef}
                      className="absolute left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full"
                      style={{
                        maxHeight: '240px',
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                        zIndex: 1000
                      }}
                    >
                      {suggestions.map((code, index) => (
                        <li 
                          key={index}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-center font-medium"
                          onMouseDown={() => handleAutocompleteSelect(code)}
                        >
                          {code}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Description Input */}
            <div className="mt-6 mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-500 text-xs">(Optional, max 500 characters)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDescriptionError('');
                }}
                placeholder="Add a brief description about your flashcard set (optional)"
                className={`w-full px-4 py-3 text-base rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none h-24
                  ${descriptionError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#004a74]/20'}`}
                maxLength={500}
              />
              {descriptionError && (
                <div className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircleIcon className="w-4 h-4 mr-1" />
                  {descriptionError}
                </div>
              )}
            </div>

            {flashcardError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                <AlertCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {flashcardError}
              </div>
            )}

            {/* AI Generate Button - now opens overlay */}
            <div className="mb-6">
              <button 
                onClick={() => setShowAIGenerateOverlay(true)}
                className="w-full flex items-center justify-center gap-2 
                bg-blue-100 border-2 border-[#004a74] text-[#004a74] font-bold
                px-6 py-4 rounded-lg hover:bg-blue-200 transition-colors shadow-md"
              >
                <SparklesIcon className="w-6 h-6" />
                AI Generate Cards from Notes or PDF
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#004a74] mb-4 flex items-center">
              Flashcards ({flashcards.length})
              <span className="ml-2 text-sm font-normal text-gray-500">
                {hasValidContent ? '✓ Valid content' : '- Add at least one card'}
              </span>
            </h3>

            <div className="space-y-6">
              {flashcards.map((card, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="bg-[#004a74] text-white px-6 py-3 flex items-center justify-between">
                    <span className="font-bold">Card {index + 1}</span>
                    <button 
                      onClick={() => deleteFlashcard(index)}
                      className="text-white hover:text-red-300 transition-colors"
                      aria-label="Delete card"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-[#004a74] mb-3 flex items-center">
                        <span className="bg-[#e3f3ff] text-[#004a74] px-3 py-1 rounded-lg text-sm mr-2">Q</span>
                        Question
                      </h3>
                      <textarea 
                        value={card.question}
                        onChange={(e) => updateFlashcard(index, 'question', e.target.value)}
                        placeholder="Enter your question here"
                        className="w-full min-h-[150px] p-3 text-base rounded-lg border border-gray-200 
                          focus:outline-none focus:ring-2 focus:ring-[#004a74]/20 resize-none"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#004a74] mb-3 flex items-center">
                        <span className="bg-[#e3f3ff] text-[#004a74] px-3 py-1 rounded-lg text-sm mr-2">A</span>
                        Answer
                      </h3>
                      <textarea 
                        value={card.answer}
                        onChange={(e) => updateFlashcard(index, 'answer', e.target.value)}
                        placeholder="Enter your answer here"
                        className="w-full min-h-[150px] p-3 text-base rounded-lg border border-gray-200 
                          focus:outline-none focus:ring-2 focus:ring-[#004a74]/20 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button 
                onClick={addFlashcard}
                className="px-4 py-2 bg-white border border-[#004a74] text-[#004a74] 
                  rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                Add a New Card
              </button>
            </div>
          </div>

          {/* Spacer to ensure content can scroll behind the fixed save bar */}
          <div className="pb-24"></div>
        </div>
      </div>

      {/* Sticky Save Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl py-4">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-4">
            <button 
              onClick={() => saveFlashcardSet(false)} 
              className="px-4 py-4 bg-white text-[#004a74] border-2 border-[#004a74] rounded-xl 
                hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-3 group shadow-md"
              disabled={isLoading}
            >
              <LockIcon className="w-6 h-6 text-[#004a74] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-bold block">
                  {isLoading ? 'Saving...' : 'Save as Private'}
                </span>
                <span className="text-xs text-gray-500 block">Only you can access</span>
              </div>
            </button>
            <button 
              onClick={() => saveFlashcardSet(true)}
              className="px-4 py-4 bg-[#004a74] text-white rounded-xl 
                hover:bg-[#00659f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed 
                flex items-center justify-center gap-3 group shadow-xl"
              disabled={isLoading}
            >
              <GlobeIcon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-bold block">
                  {isLoading ? 'Saving...' : 'Save & Publish'}
                </span>
                <span className="text-xs text-white/80 block">Everyone can view</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* AI Generate Overlay */}
      {showAIGenerateOverlay && (
        <AIGenerateOverlay 
          onClose={() => setShowAIGenerateOverlay(false)}
          onGenerate={handleAIGeneratedFlashcards}
        />
      )}

      {showExitModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
            <h3 className="text-xl font-bold text-[#004a74] mb-3">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">You have unsaved changes. What would you like to do?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={handleSaveAndExit}
                className="px-4 py-2 bg-[#004a74] text-white rounded-lg hover:bg-[#00659f] transition-colors flex items-center justify-center gap-2"
              >
                <SaveIcon className="w-4 h-4" />
                Save and Exit
              </button>
              <button 
                onClick={handleExitWithoutSaving}
                className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Exit Without Saving
              </button>
              <button 
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors sm:col-span-2"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetCreator;
