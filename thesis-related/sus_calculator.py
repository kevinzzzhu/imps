import re
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Patch # Added for custom legend

def calculate_sus_score(scores):
    positive_indices = [0, 2, 4, 6, 8, 10, 11]  # 0-indexed: Q1, Q3, Q5, Q7, Q9, Q11, Q12
    negative_indices = [1, 3, 5, 7, 9]      # 0-indexed: Q2, Q4, Q6, Q8, Q10

    adjusted_scores_sum = 0
    if len(scores) != 12:
        print(f"Warning: Participant has {len(scores)} scores, expected 12 for SUS calculation.")
        return None

    for i, score in enumerate(scores):
        if i in positive_indices:
            adjusted_scores_sum += (score - 1)
        elif i in negative_indices:
            adjusted_scores_sum += (5 - score)
    
    return adjusted_scores_sum * (100/48) # Scaled to 0-100 for 12 questions

def get_adjusted_scores_for_plotting(raw_scores_list):
    """Adjusts raw scores (1-5) to the 0-4 scale used in SUS contributions."""
    positive_indices = [0, 2, 4, 6, 8, 10, 11]
    negative_indices = [1, 3, 5, 7, 9]
    adjusted_participant_scores = []

    for scores in raw_scores_list:
        if len(scores) != 12:
            # This should be filtered by the caller, but as a safeguard
            continue 
        current_adjusted = []
        for i, score in enumerate(scores):
            if i in positive_indices:
                current_adjusted.append(score - 1)
            elif i in negative_indices:
                current_adjusted.append(5 - score)
            # No else needed as all 12 questions are covered by positive/negative indices
        adjusted_participant_scores.append(current_adjusted)
    return adjusted_participant_scores

def plot_average_adjusted_scores_barchart(all_raw_scores_list, output_filename="sus_avg_adjusted_scores_barchart.png"):
    """Plots a horizontal bar chart of the average SUS-adjusted scores (0-4 scale) per question."""
    if not all_raw_scores_list:
        print("No valid raw scores available to plot average adjusted scores bar chart.")
        return

    num_questions = 12
    valid_raw_scores_list = [s for s in all_raw_scores_list if len(s) == num_questions]
    if not valid_raw_scores_list:
        print("No participants with 12 scores found for adjusted scores bar chart.")
        return
        
    adjusted_scores_for_plot = get_adjusted_scores_for_plotting(valid_raw_scores_list)
    if not adjusted_scores_for_plot:
        print("Could not generate adjusted scores for bar chart plotting.")
        return

    scores_by_question_adjusted = np.array(adjusted_scores_for_plot).T 
    if scores_by_question_adjusted.shape[0] != num_questions:
        print(f"Adjusted scores data structure issue. Cannot plot bar chart.")
        return

    average_adjusted_ratings = np.mean(scores_by_question_adjusted, axis=1)
    question_labels_for_plot = [f"Q{i+1}" for i in range(num_questions)]

    plt.style.use('seaborn-v0_8-whitegrid') 
    fig, ax = plt.subplots(figsize=(8, 6))
    bars = ax.barh(question_labels_for_plot, average_adjusted_ratings, color='#1f77b4') # A different blue
    ax.set_xlabel("Average Adjusted Score (0-4 Scale)")
    ax.set_ylabel("Question") 
    ax.set_xlim(0, 4.0)
    ax.invert_yaxis()
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.05, bar.get_y() + bar.get_height()/2., f'{width:.2f}', ha='left', va='center', fontsize=9)
    plt.title("Average Adjusted Score per Question (SUS Contribution Style)")
    plt.tight_layout()
    try:
        plt.savefig(output_filename)
        print(f"Bar chart of average adjusted scores saved as {output_filename}")
    except Exception as e:
        print(f"Error saving average adjusted scores bar chart: {e}")
    plt.close(fig) # Close figure to free memory

def plot_question_boxplots(all_raw_scores_list, output_filename="sus_question_boxplots.png"):
    """Plots box plots of the raw Likert scale ratings (1-5) per question."""
    if not all_raw_scores_list:
        print("No valid raw scores available to plot question boxplots.")
        return

    num_questions = 12
    valid_raw_scores_list = [s for s in all_raw_scores_list if len(s) == num_questions]
    if not valid_raw_scores_list:
        print("No participants with 12 scores found for boxplots.")
        return
        
    scores_by_question_raw = np.array(valid_raw_scores_list).T.tolist()
    if len(scores_by_question_raw) != num_questions:
        print(f"Raw scores data structure issue. Cannot plot boxplots.")
        return

    question_labels_for_plot = [f"Q{i+1}" for i in range(num_questions)]

    print("\nBox Plot Data (Raw Likert Scale 1-5):")
    for i, question_scores in enumerate(scores_by_question_raw):
        q_label = question_labels_for_plot[i]
        if not question_scores:  # Handle case where a question might have no scores if filtering was different
            print(f"{q_label}: No data")
            continue
        
        min_val = np.min(question_scores)
        q1_val = np.percentile(question_scores, 25)
        median_val = np.median(question_scores)
        q3_val = np.percentile(question_scores, 75)
        max_val = np.max(question_scores)
        mean_val = np.mean(question_scores)
        
        print(f"{q_label}: Min={min_val:.2f}, Q1={q1_val:.2f}, Median={median_val:.2f}, Q3={q3_val:.2f}, Max={max_val:.2f}, Mean={mean_val:.2f}")

    plt.style.use('seaborn-v0_8-whitegrid') 
    fig, ax = plt.subplots(figsize=(10, 7))
    boxplot_elements = ax.boxplot(
        scores_by_question_raw, 
        vert=True, 
        patch_artist=True, 
        tick_labels=question_labels_for_plot,
        showmeans=True, 
        meanprops={
            'marker': '^',
            'markerfacecolor': 'red', 
            'markeredgecolor': 'red', 
            'markersize': 8
        }
    )
    for patch in boxplot_elements['boxes']:
        patch.set_facecolor('orange')
    for median in boxplot_elements['medians']:
        median.set_color('green'); median.set_linewidth(2)
    for whisker in boxplot_elements['whiskers']:
        whisker.set_color('black'); whisker.set_linewidth(1.5)
    for cap in boxplot_elements['caps']:
        cap.set_color('black'); cap.set_linewidth(1.5)

    ax.set_xlabel("Question")
    ax.set_ylabel("Likert Scale Rating") 
    ax.set_ylim(0, 6.5) 
    ax.set_yticks(np.arange(0, 7, 1))
    plt.title("Distribution of Raw Likert Scale Ratings per Question")
    plt.tight_layout()
    try:
        plt.savefig(output_filename)
        print(f"Boxplot graph saved as {output_filename}")
    except Exception as e:
        print(f"Error saving boxplot graph: {e}")
    plt.close(fig) # Close figure to free memory

def plot_overall_sus_score_distribution(all_sus_scores, output_filename="sus_overall_score_distribution.png"):
    """Plots a histogram of the overall SUS scores (0-100 scale)."""
    if not all_sus_scores:
        print("No SUS scores available to plot distribution.")
        return

    mean_score = np.mean(all_sus_scores)
    median_score = np.median(all_sus_scores)

    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(8, 6))

    # Plot histogram
    # Using density=True normalizes the histogram so the area sums to 1, useful for comparing distributions
    # or if overlaying a Kernel Density Estimate (KDE) later.
    # For simple frequency, density=False would be used.
    ax.hist(all_sus_scores, bins='auto', density=False, alpha=0.75, color='cornflowerblue', edgecolor='black')

    # Add vertical lines for mean and median
    ax.axvline(mean_score, color='red', linestyle='dashed', linewidth=1.5, label=f'Mean: {mean_score:.2f}')
    ax.axvline(median_score, color='green', linestyle='dashed', linewidth=1.5, label=f'Median: {median_score:.2f}')
    
    ax.set_xlabel("Overall SUS Score (0-100)")
    ax.set_ylabel("Frequency")
    ax.set_title("Distribution of Overall SUS Scores")
    ax.legend()
    plt.tight_layout()

    try:
        plt.savefig(output_filename)
        print(f"Overall SUS score distribution graph saved as {output_filename}")
    except Exception as e:
        print(f"Error saving overall SUS score distribution graph: {e}")
    plt.close(fig)

def plot_grouped_question_boxplots(all_raw_scores_list, participant_data, group1_pids, group1_name, group1_color, group2_pids, group2_name, group2_color, output_filename="sus_grouped_question_boxplots.png"):
    """Plots side-by-side box plots of raw Likert scale ratings per question for two defined groups."""
    if not all_raw_scores_list:
        print("No valid raw scores available to plot grouped question boxplots.")
        return
    if not participant_data:
        print("No participant data available to map PIDs to scores for grouped boxplots.")
        return

    num_questions = 12
    
    # Create a mapping from participant ID (e.g., "P1") to their scores
    pid_to_scores = {}
    for entry in participant_data:
        # entry["id"] is now expected to be in "P<number>" format from main()
        formatted_pid = entry["id"]
        if len(entry["scores"]) == num_questions:
                pid_to_scores[formatted_pid] = entry["scores"]
        else:
            print(f"Warning (grouped_boxplot): {formatted_pid} has {len(entry['scores'])} scores, expected 12. Skipping for this plot.")

    group1_scores_by_question = [[] for _ in range(num_questions)]
    group2_scores_by_question = [[] for _ in range(num_questions)]

    for q_idx in range(num_questions):
        for pid in group1_pids:
            if pid in pid_to_scores:
                group1_scores_by_question[q_idx].append(pid_to_scores[pid][q_idx])
        for pid in group2_pids:
            if pid in pid_to_scores:
                group2_scores_by_question[q_idx].append(pid_to_scores[pid][q_idx])

    # Check if we have data for plotting
    if not any(any(q_scores) for q_scores in group1_scores_by_question) and \
       not any(any(q_scores) for q_scores in group2_scores_by_question):
        print("No data found for any question in either group for grouped boxplots. PIDs might not match or data is missing.")
        print(f"  PIDs for Group 1 ({group1_name}): {group1_pids}")
        print(f"  PIDs for Group 2 ({group2_name}): {group2_pids}")
        print(f"  Available PIDs with scores: {list(pid_to_scores.keys())}")
        return

    question_labels_for_plot = [f"Q{i+1}" for i in range(num_questions)]
    
    plt.style.use('seaborn-v0_8-whitegrid')
    fig, ax = plt.subplots(figsize=(15, 8)) # Adjusted size for two boxes per question

    positions_group1 = np.array(range(num_questions)) * 2.5 - 0.4
    positions_group2 = np.array(range(num_questions)) * 2.5 + 0.4

    box_width = 0.6

    # Plotting for Group 1
    bp1 = ax.boxplot(group1_scores_by_question, 
                     positions=positions_group1, 
                     widths=box_width, 
                     patch_artist=True, 
                     showmeans=False, # Mean marker can be distracting with two boxes
                     boxprops=dict(facecolor=group1_color, color='black'),
                     medianprops=dict(color='black', linewidth=1.5),
                     whiskerprops=dict(color='black', linewidth=1),
                     capprops=dict(color='black', linewidth=1),
                     flierprops=dict(marker='o', markerfacecolor='grey', markersize=5, linestyle='none', markeredgecolor='black')
                    )

    # Plotting for Group 2
    bp2 = ax.boxplot(group2_scores_by_question, 
                     positions=positions_group2, 
                     widths=box_width, 
                     patch_artist=True, 
                     showmeans=False,
                     boxprops=dict(facecolor=group2_color, color='black'),
                     medianprops=dict(color='black', linewidth=1.5),
                     whiskerprops=dict(color='black', linewidth=1),
                     capprops=dict(color='black', linewidth=1),
                     flierprops=dict(marker='o', markerfacecolor='grey', markersize=5, linestyle='none', markeredgecolor='black')
                    )

    ax.set_xlabel("Question")
    ax.set_ylabel("Likert Scale Rating (1-5)")
    ax.set_xticks(np.array(range(num_questions)) * 2.5)
    ax.set_xticklabels(question_labels_for_plot)
    ax.set_ylim(0, 6.5)
    ax.set_yticks(np.arange(0, 7, 1))
    plt.title(f"Distribution of Raw Likert Ratings per Question: {group1_name} vs {group2_name}")

    legend_elements = [Patch(facecolor=group1_color, edgecolor='black', label=group1_name),
                       Patch(facecolor=group2_color, edgecolor='black', label=group2_name)]
    ax.legend(handles=legend_elements, loc='upper right')

    plt.tight_layout()
    try:
        plt.savefig(output_filename)
        print(f"Grouped boxplot graph saved as {output_filename}")
    except Exception as e:
        print(f"Error saving grouped boxplot graph: {e}")
    plt.close(fig)

def main():
    participant_data = [] 
    all_individual_raw_scores_list = [] 
    all_sus_scores = []
    participant_id = None

    try:
        with open("susResult.txt", "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("Participant"):
                    # participant_id = line.split(":")[0]
                    # Updated PID parsing to match wilcoxon_test.py style (P1, P2, etc.)
                    match = re.search(r"Participant\s*(\d+):?", line)
                    if match:
                        participant_number_str = match.group(1)
                        try:
                            participant_id = f"P{int(participant_number_str)}" # Format as P1, P2 etc.
                        except ValueError:
                            print(f"Warning: Could not convert participant number '{participant_number_str}' to integer from line: {line}")
                            participant_id = None # Ensure it's None if conversion fails
                    else:
                        # Fallback or use original if specific format like "Participant 001" is also needed elsewhere unchanged
                        # For now, we prioritize P<number> for the new plot
                        # participant_id = line.split(":")[0] # Original fallback, but might be better to ensure it's None or a clear non-P<num> ID
                        print(f"Warning: Participant line format not recognized for P<number> conversion: {line}")
                        participant_id = None # Set to None if primary parsing fails

                elif line.startswith("[") and line.endswith("]"):
                    try:
                        scores_str = line.strip('[]')
                        current_scores = [int(s.strip()) for s in scores_str.split(',') if s.strip().isdigit()]
                        
                        if len(current_scores) != 12:
                            print(f"Warning: {participant_id if participant_id else 'Unknown Participant'} has {len(current_scores)} scores. Expected 12. Skipping.")
                            participant_id = None 
                            continue

                        if participant_id:
                            participant_data.append({"id": participant_id, "scores": current_scores})
                            all_individual_raw_scores_list.append(current_scores) 
                            participant_id = None 
                        else:
                            print(f"Warning: Found scores {current_scores} without a preceding participant ID.")
                    except ValueError as e:
                        print(f"Error parsing scores from line: {line}. Error: {e}. Skipping this line.")
                    except Exception as e:
                        print(f"An unexpected error occurred while parsing scores: {line}. Error: {e}. Skipping this line.")
                        
    except FileNotFoundError:
        print("Error: susResult.txt not found.")
        return
    except Exception as e:
        print(f"An error occurred while reading the file: {e}")
        return

    if not participant_data:
        print("No valid participant data found for processing.")
        return

    print("SUS Scores:")
    for entry in participant_data:
        sus_score = calculate_sus_score(entry["scores"])
        if sus_score is not None: 
            print(f'{entry["id"]}: {sus_score:.2f}')
            all_sus_scores.append(sus_score)

    if all_sus_scores:
        average_sus_score = sum(all_sus_scores) / len(all_sus_scores)
        print(f"\nAverage SUS Score: {average_sus_score:.2f}")
        # Plotting the distribution of overall SUS scores
        plot_overall_sus_score_distribution(all_sus_scores)
    else:
        print("\nNo SUS scores were calculated.")

    if all_individual_raw_scores_list:
        plot_question_boxplots(all_individual_raw_scores_list) # Box plot of raw 1-5 scores
        plot_average_adjusted_scores_barchart(all_individual_raw_scores_list) # Bar chart of avg 0-4 adjusted scores
        
        # Define groups for the new plot
        # These PIDs should match the format derived in plot_grouped_question_boxplots (e.g., "P1", "P2")
        musical_group1_pids = ["P2", "P3"]
        musical_group2_pids = ["P1", "P4", "P5"]
        
        plot_grouped_question_boxplots(
            all_individual_raw_scores_list,
            participant_data, # Pass participant_data for PID mapping
            musical_group1_pids, 
            "Musical - Experienced", 
            '#d62728', # Red
            musical_group2_pids, 
            "Musical - Less Experienced", 
            '#1f77b4', # Blue
            output_filename="sus_grouped_musical_question_boxplots.png"
        )
    else:
        print("No data available to generate graphs.")

if __name__ == "__main__":
    main()