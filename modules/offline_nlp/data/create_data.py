import pandas

df = pandas.read_csv('dataset_ditto.csv')

add_df = pandas.DataFrame([
    ['security', 'none', 'front door', 'open the front door camera'],
    ['security', 'none', 'front door', 'can you open the front door camera please'],
    ['security', 'none', 'front door', 'can you open the front door camera please'],
    ['security', 'none', 'front door', 'front door camera'],
    ['security', 'none', 'front door', 'show me front door camera'],
    ['security', 'none', 'front door', 'pull up the front door view'],
    ['security', 'none', 'front door', 'pull up the front door camera'],
    ['security', 'none', 'front door', 'pull up front door video feed'],
], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df = pandas.concat([df, add_df],join='inner', ignore_index=True).to_csv('dataset_ditto.csv', index=False)