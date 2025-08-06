#!/bin/bash

# Parse command line arguments
VERBOSE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --verbose) VERBOSE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Enable debug mode only in verbose mode
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Function to log messages
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=""
    
    if [ "$VERBOSE" = true ]; then
        timestamp="[$(date)] "
    fi
    
    case $level in
        INFO)
            echo "${timestamp}${message}"
            ;;
        DEBUG)
            if [ "$VERBOSE" = true ]; then
                echo "${timestamp}${message}"
            fi
            ;;
    esac
}

log INFO "Starting dependabot PR processing script..."

# Get all open PRs with the dependencies label and created by dependabot
log INFO "Fetching open dependabot PRs..."
prs=$(gh pr list --label dependencies --author app/dependabot --json number,title,statusCheckRollup --jq '.[]')

if [ -z "$prs" ]; then
    log INFO "No dependabot PRs found to process"
    exit 0
fi

log INFO "Found PRs to process..."

while IFS= read -r pr_json; do
    pr_number=$(echo "$pr_json" | jq -r '.number')
    pr_title=$(echo "$pr_json" | jq -r '.title')
    checks_passed=true
    
    log INFO "----------------------------------------"
    log INFO "Processing PR #$pr_number: $pr_title"
    
    # Log raw JSON in verbose mode
    if [ "$VERBOSE" = true ]; then
        log DEBUG "Raw PR data:"
        echo "$pr_json" | jq '.'
    fi
    
    # Count total checks for this PR
    total_checks=$(echo "$pr_json" | jq -r '.statusCheckRollup | length')
    log INFO "Total status checks to verify: $total_checks"
    
    # Check all status checks
    check_count=0
    while IFS= read -r check_status; do
        ((check_count++))
        check_name=$(echo "$pr_json" | jq -r ".statusCheckRollup[$((check_count-1))].name")
        
        if [ "$VERBOSE" = true ]; then
            log DEBUG "Checking status check $check_count/$total_checks ($check_name): $check_status"
        fi
        
        if [ "$check_status" != "SUCCESS" ] && [ "$check_status" != "NEUTRAL" ] && [ "$check_status" != "SKIPPED" ]; then
            checks_passed=false
            log INFO "❌ Check '$check_name' failed with status: $check_status"
            break
        elif [ "$VERBOSE" = true ]; then
            if [ "$check_status" = "SKIPPED" ]; then
                log DEBUG "⏭️  Check '$check_name' skipped (status: $check_status)"
            else
                log DEBUG "✅ Check '$check_name' passed with status: $check_status"
            fi
        fi
    done < <(echo "$pr_json" | jq -r '.statusCheckRollup[].conclusion')
    
    if [ "$checks_passed" = true ]; then
        log INFO "All checks passed for PR #$pr_number, proceeding with approval..."
        
        # Leave a comment instructing dependabot to squash and merge
        log INFO "Commenting on PR #$pr_number..."
        if gh pr review "$pr_number" --comment -b "@dependabot squash and merge"; then
            log INFO "Successfully commented on PR #$pr_number"
        else
            log INFO "❌ Failed to comment on PR #$pr_number"
            continue
        fi
        
        # Approve the PR
        log INFO "Approving PR #$pr_number..."
        if gh pr review "$pr_number" --approve; then
            log INFO "Successfully approved PR #$pr_number"
        else
            log INFO "❌ Failed to approve PR #$pr_number"
        fi
    else
        log INFO "⚠️ Skipping PR #$pr_number due to failed checks"
    fi
done < <(echo "$prs")

log INFO "----------------------------------------"
log INFO "Done processing all dependency PRs!" 