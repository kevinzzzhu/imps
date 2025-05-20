import re
from scipy import stats

def calculate_sus_score(scores):
    """
    Calculates the SUS score (0-100) from a list of 12 raw scores (1-5).
    Q1, Q3, Q5, Q7, Q9, Q11, Q12 are positive.
    Q2, Q4, Q6, Q8, Q10 are negative.
    """
    positive_indices = [0, 2, 4, 6, 8, 10, 11]  # 0-indexed
    negative_indices = [1, 3, 5, 7, 9]          # 0-indexed

    adjusted_scores_sum = 0
    if len(scores) != 12:
        print(f"Warning: Expected 12 scores, got {len(scores)}. Cannot calculate SUS score.")
        return None

    for i, score in enumerate(scores):
        if not (1 <= score <= 5):
            print(f"Warning: Score {score} at index {i} is out of range (1-5). Cannot calculate SUS score.")
            return None
        if i in positive_indices:
            adjusted_scores_sum += (score - 1)
        elif i in negative_indices:
            adjusted_scores_sum += (5 - score)
    
    # For 12 items, max contribution is 12 * 4 = 48. Scale to 0-100.
    return adjusted_scores_sum * (100 / 48)

def parse_sus_results(filename="susResult.txt"):
    """
    Parses the susResult.txt file to extract participant IDs and their raw scores.
    Returns a dictionary mapping participant ID (e.g., "P1") to their list of 12 scores.
    """
    participant_raw_scores = {}
    current_participant_id = None
    print(f"Attempting to parse '{filename}'...")
    try:
        with open(filename, "r") as f:
            for line_num, line_content in enumerate(f, 1):
                line = line_content.strip()
                print(f"L{line_num}: Processing line: '{line}'") # Show the raw line with line number

                if not line: # Skip empty lines
                    print(f"  L{line_num}: Skipped empty line.")
                    continue

                if line.startswith("Participant"):
                    # Extracts "P1" from "Participant 001:" or "Participant 1:" etc.
                    # Using a literal space instead of \s+ for stricter matching based on observed file format.
                    match = re.search(r"Participant (\d+):?", line) # Capture digits only, use literal space
                    if match:
                        participant_number_str = match.group(1)
                        try:
                            participant_number = int(participant_number_str) # Convert to int to remove leading zeros
                            current_participant_id = f"P{participant_number}" # Format as P1, P2 etc.
                            print(f"  L{line_num}: Recognized and formatted Participant ID: '{current_participant_id}'")
                        except ValueError:
                            print(f"  L{line_num}: Could not convert participant number '{participant_number_str}' to integer.")
                            current_participant_id = None
                    else:
                        print(f"  L{line_num}: Line started with 'Participant' but ID format not recognized by regex: r\"Participant (\\d+):?\"")
                        current_participant_id = None # Explicitly set to None
                elif line.startswith("[") and line.endswith("]"):
                    print(f"  L{line_num}: Line looks like a score array. Current active PID: '{current_participant_id}'")
                    if current_participant_id:
                        try:
                            scores_str = line.strip('[]')
                            raw_scores = [int(s.strip()) for s in scores_str.split(',') if s.strip().isdigit()]
                            
                            if len(raw_scores) == 12:
                                participant_raw_scores[current_participant_id] = raw_scores
                                print(f"    L{line_num}: Successfully parsed 12 scores for {current_participant_id}.")
                            else:
                                print(f"    L{line_num}: Warning: {current_participant_id} has {len(raw_scores)} scores. Expected 12. Skipping.")
                            current_participant_id = None # Reset after processing scores for this participant
                        except ValueError as e:
                            print(f"    L{line_num}: Error parsing scores for {current_participant_id} from line: '{line}'. Error: {e}. Skipping.")
                            current_participant_id = None # Reset on error
                    else:
                        print(f"  L{line_num}: Found score line but no active Participant ID. Skipping score line.")
                else:
                    print(f"  L{line_num}: Line not recognized as Participant ID or score array.")
                        
    except FileNotFoundError:
        print(f"Error: {filename} not found.")
        return None
    except Exception as e:
        print(f"An error occurred while reading {filename}: {e}")
        return None
        
    if not participant_raw_scores:
        print("No valid participant data found for processing.")
        return None
        
    return participant_raw_scores

def perform_mann_whitney_u(group1_scores, group2_scores, group1_name="Group 1", group2_name="Group 2"):
    """
    Performs the Mann-Whitney U test and prints the results.
    """
    if not group1_scores or not group2_scores:
        print(f"Cannot perform test: One or both groups for the comparison are empty.")
        print(f"{group1_name} scores: {group1_scores}")
        print(f"{group2_name} scores: {group2_scores}")
        return

    # For very small sample sizes, SciPy's mannwhitneyu defaults to 'exact' method where possible.
    u_statistic, p_value = stats.mannwhitneyu(group1_scores, group2_scores, alternative='two-sided')
    
    print(f"\nMann-Whitney U test for {group1_name} vs {group2_name}:")
    print(f"  {group1_name} SUS scores: {group1_scores}")
    print(f"  {group2_name} SUS scores: {group2_scores}")
    print(f"  U-statistic: {u_statistic:.2f}")
    print(f"  P-value: {p_value:.4f}")

    alpha = 0.05
    if p_value < alpha:
        print(f"  The difference is statistically significant at alpha = {alpha}.")
    else:
        print(f"  The difference is not statistically significant at alpha = {alpha}.")

def main():
    print("Starting main function...")
    participant_raw_scores = parse_sus_results()
    if not participant_raw_scores:
        print("Exiting main: No raw scores parsed. Check parsing logs above.")
        return

    print("Raw scores parsed successfully.")
    participant_sus_scores = {}
    for pid, raw_scores in participant_raw_scores.items():
        print(f"Calculating SUS score for {pid} with raw scores: {raw_scores}")
        sus_score = calculate_sus_score(raw_scores)
        if sus_score is not None:
            participant_sus_scores[pid] = sus_score
            print(f"  SUS score for {pid}: {sus_score:.2f}")
        else:
            print(f"  Could not calculate SUS score for {pid}. This participant will be excluded from tests.")

    if not participant_sus_scores:
        print("Exiting main: No SUS scores could be calculated for any participant.")
        return
    
    print("\nOverall SUS Scores Calculated and Ready for Grouping:")
    for pid, score in participant_sus_scores.items():
        print(f"  {pid}: {score:.2f}")

    # --- Define Groups ---
    # Modify these lists if your grouping differs. Ensure participant IDs match those in susResult.txt (e.g., "P1", "P2")
    print("\nDefining participant groups for tests...")
    musical_group_definitions = {
        "M_Experienced": ["P2", "P3"],
        "M_LessExperienced": ["P1", "P4", "P5"]
    }

    technical_group_definitions = {
        "T_Experienced": ["P2", "P4"],
        "T_LessExperienced": ["P1", "P3", "P5"]
    }
    print("Group definitions set.")

    # --- Perform Test for Musical Background ---
    print("\n--- Preparing for Test based on Musical Background ---")
    m_group1_pids = musical_group_definitions["M_Experienced"]
    m_group2_pids = musical_group_definitions["M_LessExperienced"]
    
    m_group1_scores = [participant_sus_scores[pid] for pid in m_group1_pids if pid in participant_sus_scores]
    m_group2_scores = [participant_sus_scores[pid] for pid in m_group2_pids if pid in participant_sus_scores]
    
    print(f"Musical Group 1 (Experienced) PIDs: {m_group1_pids} -> Scores: {m_group1_scores}")
    print(f"Musical Group 2 (Less Experienced) PIDs: {m_group2_pids} -> Scores: {m_group2_scores}")
    
    if len(m_group1_scores) != len(m_group1_pids):
        print(f"Warning: Mismatch in expected count for Musical Group 1. Expected {len(m_group1_pids)}, got {len(m_group1_scores)} scores. Check PIDs.")
    if len(m_group2_scores) != len(m_group2_pids):
        print(f"Warning: Mismatch in expected count for Musical Group 2. Expected {len(m_group2_pids)}, got {len(m_group2_scores)} scores. Check PIDs.")
        
    perform_mann_whitney_u(m_group1_scores, m_group2_scores, "Musical - Experienced", "Musical - Less Experienced")

    print("\n--- Wilcoxon Test Regarding the Significant Difference on Each Question (Musical Background) ---")
    if participant_raw_scores: # Ensure raw scores were actually parsed
        for i in range(12): # For each question (0 to 11 for indexing, 1 to 12 for display)
            q_num = i + 1
            
            # Gather scores for the current question i for musical groups
            m_group1_q_scores = [participant_raw_scores[pid][i] for pid in m_group1_pids if pid in participant_raw_scores]
            m_group2_q_scores = [participant_raw_scores[pid][i] for pid in m_group2_pids if pid in participant_raw_scores]

            # Check if groups have enough data for the test
            if not m_group1_q_scores or not m_group2_q_scores:
                print(f"Q {q_num}: Cannot perform test for Musical Background - one or both groups have no scores for this question or PIDs not found in raw scores.")
                continue
            if len(m_group1_q_scores) < 1 or len(m_group2_q_scores) < 1: # SciPy requires at least 1 observation
                 print(f"Q {q_num}: Not enough data for Musical Background (Group1: {len(m_group1_q_scores)}, Group2: {len(m_group2_q_scores)}) to perform test.")
                 continue

            try:
                u_stat, p_val = stats.mannwhitneyu(m_group1_q_scores, m_group2_q_scores, alternative='two-sided')
                print(f"Q {q_num} U-statistic: {u_stat:.1f} P Value: {p_val:.17f}")
            except ValueError as e:
                print(f"Q {q_num}: Error performing test for Musical Background for this question: {e}")

    print("\nMain function finished successfully.")

if __name__ == "__main__":
    main()