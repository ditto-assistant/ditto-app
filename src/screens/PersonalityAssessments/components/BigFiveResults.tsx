import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp } from "lucide-react"

interface BigFiveResults {
  dimension_scores: {
    [key: string]: {
      name: string
      score: number
      level: string
    }
  }
  summary: string
  descriptions: string[]
}

interface BigFiveResultsProps {
  results: BigFiveResults
  answers: any
  onBack: () => void
}

const BigFiveResults: React.FC<BigFiveResultsProps> = ({ results, answers, onBack }) => {
  const getDimensionColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProgressColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-red-500'
      case 'moderate':
        return 'bg-yellow-500'
      case 'high':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="flex flex-col h-full p-4 bg-background text-foreground">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Big Five Personality Results</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personality Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{results.summary}</p>
          </CardContent>
        </Card>

        {/* Dimension Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dimension Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(results.dimension_scores).map(([dimensionId, dimension]) => (
              <div key={dimensionId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{dimension.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={getDimensionColor(dimension.level)}
                    >
                      {dimension.level}
                    </Badge>
                  </div>
                  <span className="font-semibold text-lg">
                    {dimension.score}/5.0
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(dimension.level)}`}
                    style={{ width: `${(dimension.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detailed Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.descriptions.map((description, index) => (
                <div 
                  key={index}
                  className="p-3 bg-muted/50 rounded-lg border-l-4 border-l-blue-500"
                >
                  <p className="text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Answers Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(answers || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">Questions Answered</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(results.dimension_scores).length}
                </div>
                <div className="text-sm text-muted-foreground">Personality Dimensions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BigFiveResults 