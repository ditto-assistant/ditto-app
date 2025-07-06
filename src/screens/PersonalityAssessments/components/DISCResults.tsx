import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Award } from "lucide-react"

interface DISCResults {
  profile_summary: string
  profile_description: string
  dimension_scores: {
    [key: string]: {
      name: string
      score: number
      percentage: number
    }
  }
  primary_style: {
    id: string
    name: string
    description: string
  }
  secondary_style: {
    id: string
    name: string
    description: string
  }
}

interface DISCResultsProps {
  results: DISCResults
  answers: any
  onBack: () => void
}

const DISCResults: React.FC<DISCResultsProps> = ({
  results,
  answers,
  onBack,
}) => {
  const getDimensionColor = (id: string, percentage: number) => {
    const colors = {
      d: "bg-red-500",
      i: "bg-yellow-500",
      s: "bg-green-500",
      c: "bg-blue-500",
    }
    return colors[id as keyof typeof colors] || "bg-gray-500"
  }

  const getStyleColor = (id: string) => {
    const colors = {
      d: "bg-red-100 text-red-800 border-red-200",
      i: "bg-yellow-100 text-yellow-800 border-yellow-200",
      s: "bg-green-100 text-green-800 border-green-200",
      c: "bg-blue-100 text-blue-800 border-blue-200",
    }
    return (
      colors[id as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    )
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
          <Award className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">DISC Personality Results</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your DISC Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-xl font-semibold text-center">
              {results.profile_summary}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-center">
              {results.profile_description}
            </p>
          </CardContent>
        </Card>

        {/* Primary and Secondary Styles */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getStyleColor(results.primary_style.id)}
                >
                  {results.primary_style.id.toUpperCase()}
                </Badge>
                <CardTitle className="text-lg">Primary Style</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium mb-2">{results.primary_style.name}</h4>
              <p className="text-sm text-muted-foreground">
                {results.primary_style.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getStyleColor(results.secondary_style.id)}
                >
                  {results.secondary_style.id.toUpperCase()}
                </Badge>
                <CardTitle className="text-lg">Secondary Style</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium mb-2">
                {results.secondary_style.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {results.secondary_style.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dimension Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dimension Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(results.dimension_scores).map(
              ([dimId, dimension]) => (
                <div key={dimId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getStyleColor(dimId)}>
                        {dimId.toUpperCase()}
                      </Badge>
                      <h3 className="font-medium">{dimension.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Score: {dimension.score}
                      </span>
                      <span className="font-semibold">
                        {dimension.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getDimensionColor(dimId, dimension.percentage)}`}
                      style={{ width: `${dimension.percentage}%` }}
                    />
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(answers || {}).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Questions Answered
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(results.dimension_scores).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  DISC Dimensions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DISCResults
