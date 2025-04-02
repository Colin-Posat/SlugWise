import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X as XIcon,
  Plus as PlusIcon,
  ChevronLeft as ChevronLeftIcon,
  Sparkles as SparklesIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import NavBar from '../../components/NavBar'; // Adjust the import path as needed

// Type definitions
type Flashcard = {
  question: string;
  answer: string;
};

type FlashcardSet = {
  id: string;
  title: string;
  classCode: string;
  numCards?: number;
  flashcards: Flashcard[];
  isPublic: boolean;
  icon?: string;
  createdAt?: string;
};

// Add the animation styles to the document
const fadeInAnimation = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-in-out forwards;
}
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = fadeInAnimation;
  document.head.appendChild(style);
}

const SetCreator: React.FC = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([{ question: '', answer: '' }]);
  const [title, setTitle] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classCodes, setClassCodes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitDestination, setExitDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // New state for error messages
  const [titleError, setTitleError] = useState('');
  const [classCodeError, setClassCodeError] = useState('');
  const [flashcardError, setFlashcardError] = useState('');
  
  const autocompleteRef = useRef<HTMLUListElement>(null);
  const classCodeInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch class codes and check for editing mode on component mount
  useEffect(() => {
    fetchClassCodes();
    checkForEditingMode();
    
    // Check authentication - but don't redirect immediately
    // This allows time for the component to load properly
    const checkAuth = () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Only redirect if we're sure there's no valid user
      if (!user || (!user.id && !user.uid)) {
        console.log('No authenticated user found, redirecting to landing page');
        navigate('/');
      }
    };
    
    // Small delay to prevent immediate flashing redirect
    const timer = setTimeout(checkAuth, 300);
    return () => clearTimeout(timer);
  }, []);

  // Close autocomplete when clicking outside - exactly like SearchSetsPage
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

  // Check if we're editing an existing set
  const checkForEditingMode = () => {
    const storedSet = localStorage.getItem("editingFlashcardSet");
    if (storedSet) {
      const parsedSet = JSON.parse(storedSet) as FlashcardSet;
      setEditingSet(parsedSet);
      setTitle(parsedSet.title || '');
      setClassCode(parsedSet.classCode || '');
      
      if (Array.isArray(parsedSet.flashcards) && parsedSet.flashcards.length > 0) {
        setFlashcards(parsedSet.flashcards);
      }
    }
  };

  // Handle class code input and show suggestions
  const handleClassCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toUpperCase();
    setClassCode(value);
    setClassCodeError('');
    
    if (value.length > 0) {
      // Filter codes that START WITH the input value - exactly like SearchSetsPage
      const filteredResults = classCodes
        .filter(code => code.toUpperCase().startsWith(value))
        .slice(0, 5); // Limit to 5 results
      
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

  // Handle autocomplete item selection - exactly like SearchSetsPage
  const handleAutocompleteSelect = useCallback((code: string) => {
    setClassCode(code);
    setSuggestions([]);
    setClassCodeError('');
  }, []);

  // Handle input blur - validate input - exactly like SearchSetsPage
  const handleBlur = useCallback(() => {
    // Small timeout to allow click on autocomplete item to register first
    setTimeout(() => {
      if (classCode.trim() !== '' && !classCodes.includes(classCode.trim().toUpperCase())) {
        setClassCodeError("Please select a valid class code from the list");
        // Don't clear right away
        setTimeout(() => {
          setClassCode('');
          // Clear error message after a delay
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
      // Ensure at least one flashcard remains
      setFlashcards([{ question: '', answer: '' }]);
    } else {
      const updatedFlashcards = flashcards.filter((_, i) => i !== index);
      setFlashcards(updatedFlashcards);
    }
  };

  // Navigate with confirmation if needed
  const navigateWithConfirmation = (destination: string) => {
    // Check if there are unsaved changes
    const hasContent = flashcards.some(card => card.question.trim() || card.answer.trim());
    
    if (!hasContent && flashcards.length === 1) {
      // No content to save, navigate directly
      navigate(destination);
      return;
    }
    
    // Check if editing mode with no changes
    if (editingSet) {
      const noChanges = 
        editingSet.title === title &&
        editingSet.classCode === classCode &&
        areFlashcardsEqual(editingSet.flashcards, flashcards);
      
      if (noChanges) {
        navigate(destination);
        return;
      }
    }
    
    // Show confirmation modal
    setExitDestination(destination);
    setShowExitModal(true);
  };

  // Compare flashcards arrays
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
    
    // Clear all previous errors
    setTitleError('');
    setClassCodeError('');
    setFlashcardError('');
    
    // Validate title
    if (!title.trim()) {
      setTitleError("Please provide a title for your flashcard set");
      isValid = false;
    }
    
    // Validate class code
    if (!classCode.trim()) {
      setClassCodeError("Please select a valid class code");
      isValid = false;
    } else if (!classCodes.includes(classCode.trim().toUpperCase())) {
      setClassCodeError("Invalid class code! Please select from the list");
      isValid = false;
    }
    
    // Validate flashcards
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
      // Get the current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Check for user ID
      if (!user.id && !user.uid) {
        setFlashcardError("You must be logged in to save a set");
        return;
      }
      
      // Use whichever ID is available
      const userId = user.id || user.uid;
      
      // Validate form before proceeding
      if (!validateForm()) {
        return;
      }
      
      // Filter out completely empty flashcards
      const validFlashcards = flashcards.filter(
        card => card.question.trim() || card.answer.trim()
      );
      
      const setId = editingSet?.id || crypto.randomUUID();
      
      const newSet = {
        id: setId,
        title: title.trim(),
        classCode: classCode.trim(),
        flashcards: validFlashcards,
        isPublic: isPublic,
        userId: userId // Include the userId in the request
      };
      
      setIsLoading(true);
      
      // Log the data being sent for debugging
      console.log('Sending data to backend:', JSON.stringify(newSet));
      
      // API endpoint
      const endpoint = editingSet 
        ? `http://localhost:6500/api/sets/update/${setId}`
        : 'http://localhost:6500/api/sets/create';
        
      const method = editingSet ? 'PUT' : 'POST';
      
      // Make the API request with credentials included
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // This is important to send cookies
        body: JSON.stringify(newSet)
      });
      
      console.log('Response status:', response.status);
      
      // Handle the response
      if (response.ok) {
        console.log(`Flashcard set ${editingSet ? 'updated' : 'saved'} successfully`);
        localStorage.removeItem("editingFlashcardSet");
        navigate('/created-sets');
      } else {
        // Try to get the error message from the response
        try {
          const errorData = await response.json();
          setFlashcardError(`Failed to ${editingSet ? 'update' : 'save'} flashcard set. ${errorData.message || ''}`);
        } catch (parseError) {
          // If we can't parse JSON, get the status text
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

  // Exit modal handlers
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <NavBar />

      {/* Back Button */}
      <button 
        onClick={() => navigateWithConfirmation('/created-sets')}
        className="fixed top-4 left-4 bg-transparent text-white flex items-center 
          justify-center z-50 hover:scale-110 transition-transform"
      >
        <ChevronLeftIcon className="w-8 h-8" />
      </button>

      {/* Controls Container */}
      <div className="pt-24 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        {/* Title and Class Code */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex flex-col w-full sm:w-auto">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Set Title Eg. BIO 101 Midterm"
              className={`px-4 py-3 text-base rounded-lg w-[283px] border
                transition-all focus:outline-none focus:ring-2 
                ${titleError ? 'border-[#e53935] focus:ring-[#e53935]/20' : 'border-[#004a74] focus:ring-[#004a74]/20'}`}
            />
            {titleError && (
              <div className="text-[#e53935] text-sm mt-1 px-1 animate-fadeIn flex items-center">
                <AlertCircleIcon className="w-4 h-4 mr-1" />
                {titleError}
              </div>
            )}
          </div>
          
          {/* Class Code Input - with shorter fixed width */}
          <div className="relative w-full sm:w-auto">
            <div className="w-[150px]">
              <input
                ref={classCodeInputRef}
                type="text"
                value={classCode}
                onChange={handleClassCodeChange}
                onBlur={handleBlur}
                placeholder="Class Code"
                className={`px-4 py-3 text-base rounded-lg w-full border
                  transition-all focus:outline-none focus:ring-2
                  ${classCodeError ? 'border-[#e53935] focus:ring-[#e53935]/20' : 'border-[#004a74] focus:ring-[#004a74]/20'}`}
                autoComplete="off"
              />
              
              {classCodeError && (
                <div className="text-[#e53935] text-sm mt-1 px-1 animate-fadeIn flex items-center">
                  <AlertCircleIcon className="w-4 h-4 mr-1" />
                  {classCodeError}
                </div>
              )}
            </div>
            
            {/* Autocomplete List - Fixed width to match input */}
            {suggestions.length > 0 && (
              <ul 
                ref={autocompleteRef}
                className="absolute left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-[150px]"
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
                    className="p-3 hover:bg-[#e3f3ff] cursor-pointer border-b border-gray-100 text-center font-medium"
                    onMouseDown={() => handleAutocompleteSelect(code)}
                  >
                    {code}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex gap-3 mt-4 md:mt-0">
          <button 
            onClick={() => saveFlashcardSet(false)} 
            className="px-5 py-3 bg-[#004a74] text-white font-bold rounded-lg 
              hover:bg-[#00659f] hover:scale-[1.03] transition-all min-w-[120px]
              disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={() => saveFlashcardSet(true)}
            className="px-5 py-3 bg-[#004a74] text-white font-bold rounded-lg 
              hover:bg-[#00659f] hover:scale-[1.03] transition-all min-w-[120px]
              disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save and Publish'}
          </button>
        </div>
      </div>

      {/* Global error for flashcards */}
      {flashcardError && (
        <div className="px-6 mt-4">
          <div className="bg-[rgba(229,57,53,0.1)] text-[#e53935] p-3 rounded-md animate-fadeIn flex items-center">
            <AlertCircleIcon className="w-5 h-5 mr-2" />
            {flashcardError}
          </div>
        </div>
      )}

      {/* AI Generate Button - Width aligns with the end of both inputs */}
      <div className="px-6 mt-4">
        <div className="flex">
          <button className="flex items-center justify-center gap-2 bg-[#e3f3ff] text-black 
            font-bold py-3 px-5 rounded-lg hover:scale-[1.03] transition-all shadow-md 
            w-[449px] text-xl">
            <SparklesIcon className="w-6 h-6" />
            AI Generate Cards
          </button>
        </div>
      </div>

      {/* Flashcards */}
      <div className="px-6 mt-6 pb-20">
        <div className="flex flex-col gap-6">
          {flashcards.map((card, index) => (
            <div 
              key={index} 
              className="bg-[#004a74] text-white p-5 rounded-xl relative h-[220px] 
                flex items-center justify-between gap-3"
            >
              {/* Card Number */}
              <div className="flex items-center justify-center w-10 h-10 bg-white text-[#004a74] 
                rounded-full font-bold text-lg mr-3">
                {index + 1}
              </div>
              
              {/* Question */}
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-lg font-bold">Question:</label>
                <textarea 
                  value={card.question}
                  onChange={(e) => updateFlashcard(index, 'question', e.target.value)}
                  placeholder="Enter Your Question"
                  className="w-full h-32 p-3 text-lg rounded border-2 border-black resize-none text-black
                    focus:outline-none focus:ring-2 focus:ring-[#004a74]/30 transition-all"
                />
              </div>
              
              {/* Answer */}
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-lg font-bold">Answer:</label>
                <textarea 
                  value={card.answer}
                  onChange={(e) => updateFlashcard(index, 'answer', e.target.value)}
                  placeholder="Enter Your Answer"
                  className="w-full h-32 p-3 text-lg rounded border-2 border-black resize-none text-black
                    focus:outline-none focus:ring-2 focus:ring-[#004a74]/30 transition-all"
                />
              </div>
              
              {/* Delete Button */}
              <button 
                onClick={() => deleteFlashcard(index)}
                className="absolute top-2 right-2 text-white text-2xl hover:text-red-500 transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Add Card Button */}
        <button 
          onClick={addFlashcard}
          className="flex items-center justify-center gap-2 bg-[#e3f3ff] text-black 
            font-bold py-3 px-6 rounded-lg hover:scale-[1.03] transition-all 
            shadow-md w-[300px] mx-auto my-6 text-lg"
        >
          <PlusIcon className="w-5 h-5" />
          Add a New Card
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-black max-w-md w-full">
            <p className="text-lg mb-4 text-center">Do you want to save before leaving?</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={handleSaveAndExit}
                className="px-4 py-2 bg-[#00659f] text-white rounded border border-black"
              >
                Save and Exit
              </button>
              <button 
                onClick={handleExitWithoutSaving}
                className="px-4 py-2 bg-[#e3f3ff] text-black rounded border border-black"
              >
                Exit Without Saving
              </button>
              <button 
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 bg-gray-300 text-black rounded border border-black"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetCreator;