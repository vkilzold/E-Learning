import pandas as pd
import json

def format_single_entry_to_json(entry_str):
    """
    Formats a string representation of a list (e.g., "['1/2', '7/10']") into a JSON string.
    Replaces single quotes with double quotes for JSON compatibility.

    Args:
        entry_str (str): A string representing a Python list, e.g., "['1/2', '7/10']".

    Returns:
        str: A JSON formatted string of the list, or an error message if parsing fails.
    """
    try:
        # Replace single quotes with double quotes to make it valid JSON string for parsing
        json_compatible_str = entry_str.replace("'", '"')

        # Parse the string as a JSON array
        parsed_list = json.loads(json_compatible_str)

        # Ensure all elements are strings (they should be if the input is consistent)
        if not all(isinstance(item, str) for item in parsed_list):
            # This case might occur if the original string was something like "[1, 2, 3]"
            # and you specifically need strings inside the JSON array.
            # For the fraction example, it's usually ['1/2', '2/3'], so this check is a safeguard.
            return f"Error: Entry '{entry_str}' contains non-string elements after parsing."

        # Convert the parsed list back to a JSON string, ensuring double quotes
        # No indent for compact output, which is generally preferred when storing in CSV
        json_output = json.dumps(parsed_list)

        return json_output
    except json.JSONDecodeError as e:
        # Handle cases where the string isn't a valid list literal (e.g., malformed)
        print(f"Warning: Could not decode JSON for entry '{entry_str}'. Error: {e}")
        return json.dumps([]) # Return an empty JSON array or handle as appropriate
    except Exception as e:
        print(f"An unexpected error occurred for entry '{entry_str}': {e}")
        return json.dumps([]) # Return an empty JSON array or handle as appropriate

# Load the CSV file
# Make sure 'math-questions.csv' is in the same directory as this script,
# or provide the full path to the file.
try:
    df = pd.read_csv("math-questions.csv")
    print("CSV file 'math-questions.csv' loaded successfully.")
except FileNotFoundError:
    print("Error: 'math-questions.csv' not found. Please ensure the file is in the correct directory.")
    exit() # Exit if the file is not found

# Apply the formatting function to the 'choices' column
# This will convert each string like "['1/2', '7/10']" into a proper JSON string like "[\"1/2\", \"7/10\"]"
if 'choices' in df.columns:
    df['choices'] = df['choices'].apply(format_single_entry_to_json)
    print("Column 'choices' reformatted to JSON.")
else:
    print("Error: Column 'choices' not found in the CSV file. Please check the column name.")
    exit() # Exit if the column is not found

# Save the modified DataFrame to a new CSV file
# The 'index=False' prevents pandas from writing the DataFrame index as a column in the CSV.
output_csv_file = "math_quiz_questions_fixed_json.csv"
df.to_csv(output_csv_file, index=False)
print(f"Reformatted data saved to '{output_csv_file}'.")

