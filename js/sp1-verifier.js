// SP1 Score Verification Integration

// Simple score verification - just submits the final score value
async function submitScoreForVerification(score) {
    const verificationStatus = document.getElementById('verification-status');
    
    try {
        const response = await fetch('/api/prove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                final_score: score
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.job_id) {
            verificationStatus.innerHTML = `
                <div class="verification-message">
                    <p>Verification in progress...</p>
                    <p>Job ID: ${result.job_id}</p>
                </div>
            `;
            
            // Start polling for verification status
            pollVerificationStatus(result.job_id, verificationStatus);
            return true;
        } else {
            verificationStatus.innerHTML = `
                <div class="verification-error">
                    <p>Verification request failed</p>
                    <p>${result.error || 'Unknown error'}</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        verificationStatus.innerHTML = `
            <div class="verification-error">
                <p>Error sending verification request</p>
                <p>${error.message}</p>
            </div>
        `;
        return false;
    }
}

async function pollVerificationStatus(jobId, statusElement) {
    try {
        const response = await fetch(`/api/proof-status/${jobId}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        switch (result.status) {
            case 'processing':
                statusElement.innerHTML = `
                    <div class="verification-message">
                        <p>Verification in progress...</p>
                        <p>Job ID: ${jobId}</p>
                    </div>
                `;
                // Check again after 5 seconds
                setTimeout(() => pollVerificationStatus(jobId, statusElement), 5000);
                break;
                
            case 'complete':
                statusElement.innerHTML = `
                    <div class="verification-success">
                        <p>🎉 Score Verified! </p>
                        <p>Your final score of ${result.public_values ? result.public_values.split(',')[0].split(':')[1].trim() : result.score} has been cryptographically verified.</p>
                        <p><a href="/proofs/${result.proof}" target="_blank" class="download-proof">Download Proof</a></p>
                    </div>
                `;
                break;
                
            case 'failed':
                statusElement.innerHTML = `
                    <div class="verification-error">
                        <p>Verification failed</p>
                        <p>${result.error || 'Unknown error'}</p>
                    </div>
                `;
                break;
                
            default:
                statusElement.innerHTML = `
                    <div class="verification-message">
                        <p>Status: ${result.status}</p>
                    </div>
                `;
                // Check again after 5 seconds for unknown statuses
                setTimeout(() => pollVerificationStatus(jobId, statusElement), 5000);
        }
    } catch (error) {
        statusElement.innerHTML = `
            <div class="verification-error">
                <p>Error checking verification status</p>
                <p>${error.message}</p>
            </div>
        `;
        // Try again after 10 seconds in case of error
        setTimeout(() => pollVerificationStatus(jobId, statusElement), 10000);
    }
}
