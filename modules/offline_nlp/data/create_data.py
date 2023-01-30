import pandas

df = pandas.read_csv('dataset_ditto.csv')

add_df = pandas.DataFrame([
    # ['security', 'none', 'front door', 'open the front door camera'],
    # ['security', 'none', 'front door', 'can you open the front door camera please'],
    # ['security', 'none', 'front door', 'can you open the front door camera please'],
    # ['security', 'none', 'front door', 'front door camera'],
    # ['security', 'none', 'front door', 'show me front door camera'],
    # ['security', 'none', 'front door', 'pull up the front door view'],
    # ['security', 'none', 'front door', 'pull up the front door camera'],
    # ['security', 'none', 'front door', 'pull up front door video feed'],
    # ['conv', 'none', 'exit', 'Ditto can you please stop talking'],
    # ['conv', 'none', 'exit', 'I was talking to you about San Fransisco please stop talking ditto'],
    # ['conv', 'none', 'exit', 'Ditto can you please stop talking'],
    # ['conv', 'none', 'exit', 'Ditto can you please stop talking anyways I was going to my house'],
    # ['conv', 'none', 'exit', "That's okay Ditto, please cancel"],
    # ['conv', 'none', 'exit', "That's okay Ditto, please stop you want to listen to a new record"],
    # ['conv', 'none', 'exit', "you want to go see a new movie that's okay Ditto, please cancel"],
    # ['conv', 'none', 'exit', "have a nice day"],
    # ['conv', 'none', 'exit', "have a good one"],
    # ['conv', 'none', 'exit', "exit conversation"],
    # ['conv', 'none', 'exit', "exit"],
    # ['conv', 'none', 'exit', "peace out"],
    # ['conv', 'none', 'exit', "see ya later"],
    # ['conv', 'none', 'exit', "see you later"],
     
], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df = pandas.concat([df, add_df],join='inner', ignore_index=True).to_csv('dataset_ditto.csv', index=False)