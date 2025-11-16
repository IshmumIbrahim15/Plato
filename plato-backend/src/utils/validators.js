export function isValidUUID(uuid) {
     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
     return uuidRegex.test(uuid);
   }

   export function isValidScore(score) {
     return typeof score === 'number' && score >= 0 && score <= 100;
   }
   
   export function validateUserInput(username) {
     if (!username || typeof username !== 'string') {
       return { valid: false, error: 'Username must be a non-empty string' };
     }
     if (username.length < 3 || username.length > 50) {
       return { valid: false, error: 'Username must be between 3 and 50 characters' };
     }
     return { valid: true };
   }
   
   export default {
     isValidUUID,
     isValidScore,
     validateUserInput,
   };